import { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiFetch, isAuthDenied } from '../api';
import { ensureAccessToken } from '../authSession';
import { getAccessToken } from '../authStorage';
import type { FoodTemplateItem } from '../api/meals';
import {
  createMealSet,
  getMealSet,
  updateMealSet,
  type MealSetItemInput,
  type MealSetItemInputMode,
  type MealSetUpsertBody,
} from '../api/mealSets';
import { LabeledField } from '../components/LabeledField';
import { RadioGroup } from '../components/RadioGroup';
import { Segmented } from '../components/Segmented';
import { Banner, Card, PrimaryButton, ScreenLayout } from '../components/ui';
import { MEAL_SET_COPY } from '../copy/mealSet';
import { useFocusReload } from '../hooks/useFocusReload';
import {
  mealSetItemKcal,
  mealSetItemPortionLabel,
  templateUnitHint,
} from '../lib/mealSetItem';
import {
  MEAL_SLOT_OPTIONS,
  SNACK_PLACEMENT_OPTIONS,
  defaultSnackPlacementForNow,
  type MealSlot,
  type SnackPlacement,
} from '../lib/mealSlot';
import { logAppError, toUserMessage } from '../lib/userFacingError';
import type { RootStackParamList } from '../navigation';
import { useTheme } from '../theme';
import { useToast } from '../toast/useToast';

const ITEMS_MAX = 20;
const PORTION_MIN = 0.25;
const PORTION_MAX = 50;

type Nav = NativeStackNavigationProp<RootStackParamList, 'MealSetEditor'>;
type Route = RouteProp<RootStackParamList, 'MealSetEditor'>;

type DraftItem = {
  key: string;
  foodTemplateId: string;
  mealInputMode: MealSetItemInputMode;
  portionQuantity: number | null;
  totalGrams: number | null;
};

let draftSeq = 0;
function nextKey(): string {
  draftSeq += 1;
  return `draft-${Date.now()}-${draftSeq}`;
}

export function MealSetEditorScreen() {
  const t = useTheme();
  const toast = useToast();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const editId = route.params?.id;

  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [name, setName] = useState('');
  const [slot, setSlot] = useState<MealSlot>('BREAKFAST');
  const [snackPlacement, setSnackPlacement] = useState<SnackPlacement>(defaultSnackPlacementForNow());
  const [items, setItems] = useState<DraftItem[]>([]);
  const [templates, setTemplates] = useState<FoodTemplateItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const tplById = useMemo(() => {
    const map = new Map<string, FoodTemplateItem>();
    for (const tpl of templates) map.set(tpl.id, tpl);
    return map;
  }, [templates]);

  const load = useCallback(async () => {
    setState('loading');
    const token = await ensureAccessToken();
    if (!token) return;
    try {
      const tplRes = await apiFetch<{ items: FoodTemplateItem[] }>(
        '/me/food-templates?page=1&size=100',
        { token },
      );
      setTemplates(tplRes.items ?? []);
      if (editId) {
        const set = await getMealSet(token, editId);
        setName(set.name);
        setSlot(set.defaultMealSlot);
        setSnackPlacement(set.defaultSnackPlacement ?? defaultSnackPlacementForNow());
        setItems(
          set.items.map((it) => ({
            key: nextKey(),
            foodTemplateId: it.foodTemplateId ?? '',
            mealInputMode: it.mealInputMode ?? 'PORTION_COUNT',
            portionQuantity: it.portionQuantity,
            totalGrams: it.totalGrams,
          })),
        );
      }
      setState('ready');
    } catch (e) {
      if (isAuthDenied(e)) return;
      logAppError('[MealSetEditor] load', e);
      setState('error');
    }
  }, [editId]);

  useFocusReload(useCallback(() => load(), [load]));

  const nameError = showErrors && !name.trim() ? MEAL_SET_COPY.nameRequired : undefined;
  const itemsError = showErrors && items.length === 0 ? MEAL_SET_COPY.itemsEmpty : undefined;

  const addItem = (tpl: FoodTemplateItem, portion: number) => {
    setItems((prev) => {
      if (prev.length >= ITEMS_MAX) {
        toast.show({ kind: 'error', message: MEAL_SET_COPY.itemsMax(ITEMS_MAX) });
        return prev;
      }
      return [
        ...prev,
        {
          key: nextKey(),
          foodTemplateId: tpl.id,
          mealInputMode: 'PORTION_COUNT',
          portionQuantity: portion,
          totalGrams: null,
        },
      ];
    });
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((it) => it.key !== key));
  };

  const save = async () => {
    setShowErrors(true);
    if (!name.trim() || items.length === 0) return;
    if (items.length > ITEMS_MAX) {
      toast.show({ kind: 'error', message: MEAL_SET_COPY.itemsMax(ITEMS_MAX) });
      return;
    }
    setSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('로그인 필요');
      const itemInputs: MealSetItemInput[] = items.map((it) => ({
        kind: 'template',
        foodTemplateId: it.foodTemplateId,
        mealInputMode: it.mealInputMode,
        ...(it.mealInputMode === 'PORTION_COUNT'
          ? { portionQuantity: it.portionQuantity ?? 1 }
          : { totalGrams: it.totalGrams ?? 0 }),
      }));
      const body: MealSetUpsertBody = {
        name: name.trim(),
        defaultMealSlot: slot,
        defaultSnackPlacement: slot === 'SNACK' ? snackPlacement : null,
        items: itemInputs,
      };
      if (editId) {
        await updateMealSet(token, editId, body);
      } else {
        await createMealSet(token, body);
      }
      toast.show({ kind: 'success', message: MEAL_SET_COPY.saveSuccess });
      navigation.goBack();
    } catch (e) {
      if (isAuthDenied(e)) return;
      logAppError('[MealSetEditor] save', e);
      toast.show({
        kind: 'error',
        message: toUserMessage(e, { context: 'meal', fallback: MEAL_SET_COPY.saveError }),
      });
    } finally {
      setSaving(false);
    }
  };

  if (state === 'error') {
    return (
      <ScreenLayout title={editId ? MEAL_SET_COPY.editorEditTitle : MEAL_SET_COPY.editorCreateTitle}>
        <Banner variant="danger" actionLabel={MEAL_SET_COPY.retry} onAction={() => void load()}>
          {MEAL_SET_COPY.listLoadError}
        </Banner>
      </ScreenLayout>
    );
  }

  return (
    <>
      <ScreenLayout
        title={editId ? MEAL_SET_COPY.editorEditTitle : MEAL_SET_COPY.editorCreateTitle}
        loading={state === 'loading'}
        keyboardAvoiding
        contentPaddingBottomExtra={80}
      >
        <Card>
          <LabeledField
            label={MEAL_SET_COPY.nameLabel}
            value={name}
            onChangeText={setName}
            placeholder={MEAL_SET_COPY.namePlaceholder}
            maxLength={40}
          />
          {nameError ? (
            <Text style={{ color: t.colors.danger, fontSize: t.fontSize.caption }}>{nameError}</Text>
          ) : null}
        </Card>

        <Card>
          <Segmented<MealSlot>
            label={MEAL_SET_COPY.defaultSlotLabel}
            options={MEAL_SLOT_OPTIONS}
            value={slot}
            onChange={(next) => {
              setSlot(next);
              if (next === 'SNACK' && !snackPlacement) setSnackPlacement(defaultSnackPlacementForNow());
            }}
          />
          {slot === 'SNACK' ? (
            <View style={{ marginTop: t.spacing.md }}>
              <RadioGroup
                label={MEAL_SET_COPY.snackWhenLabel}
                options={SNACK_PLACEMENT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={snackPlacement}
                onChange={(v) => {
                  if (v) setSnackPlacement(v);
                }}
              />
            </View>
          ) : null}
        </Card>

        <Card>
          <Text style={{ color: t.colors.fg, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>
            {MEAL_SET_COPY.itemsTitle}
          </Text>
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>{MEAL_SET_COPY.itemsHint}</Text>

          {items.length === 0 ? (
            <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body, paddingVertical: t.spacing.sm }}>
              {MEAL_SET_COPY.itemsEmpty}
            </Text>
          ) : (
            items.map((it) => {
              const tpl = it.foodTemplateId ? tplById.get(it.foodTemplateId) : undefined;
              const unavailable = !tpl;
              const kcal = mealSetItemKcal(it, tpl);
              return (
                <View
                  key={it.key}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.spacing.sm,
                    paddingVertical: t.spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: t.colors.border,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                      <Text numberOfLines={1} style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
                        {tpl?.name ?? '삭제된 음식'}
                      </Text>
                      {unavailable ? (
                        <Text style={{ color: t.colors.warn, fontSize: t.fontSize.caption, fontWeight: '600' }}>
                          {MEAL_SET_COPY.itemUnavailable}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                      {mealSetItemPortionLabel(it, tpl)}
                      {kcal != null ? ` · ${kcal} kcal` : ''}
                    </Text>
                  </View>
                  <Pressable onPress={() => removeItem(it.key)} accessibilityRole="button" hitSlop={6}>
                    <Text style={{ color: t.colors.danger, fontSize: t.fontSize.caption, fontWeight: '600' }}>
                      {MEAL_SET_COPY.removeItem}
                    </Text>
                  </Pressable>
                </View>
              );
            })
          )}
          {itemsError ? (
            <Text style={{ color: t.colors.danger, fontSize: t.fontSize.caption }}>{itemsError}</Text>
          ) : null}

          <View style={{ marginTop: t.spacing.sm }}>
            <PrimaryButton
              title={MEAL_SET_COPY.addItem}
              variant="secondary"
              onPress={() => setAddOpen(true)}
              disabled={items.length >= ITEMS_MAX}
            />
          </View>
        </Card>

        <PrimaryButton title={MEAL_SET_COPY.save} onPress={() => void save()} loading={saving} />
      </ScreenLayout>

      <AddItemModal
        visible={addOpen}
        templates={templates}
        onClose={() => setAddOpen(false)}
        onAdd={(tpl, portion) => addItem(tpl, portion)}
      />
    </>
  );
}

function AddItemModal({
  visible,
  templates,
  onClose,
  onAdd,
}: {
  visible: boolean;
  templates: FoodTemplateItem[];
  onClose: () => void;
  onAdd: (tpl: FoodTemplateItem, portion: number) => void;
}) {
  const t = useTheme();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<FoodTemplateItem | null>(null);
  const [portion, setPortion] = useState('1');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return templates.slice(0, 50);
    return templates.filter((tpl) => tpl.name.toLowerCase().includes(needle)).slice(0, 50);
  }, [query, templates]);

  const reset = () => {
    setQuery('');
    setSelected(null);
    setPortion('1');
  };

  const confirm = () => {
    if (!selected) return;
    const value = Number(String(portion).replace(',', '.'));
    if (!Number.isFinite(value) || value < PORTION_MIN || value > PORTION_MAX) {
      toast.show({ kind: 'error', message: `분량은 ${PORTION_MIN}~${PORTION_MAX} 사이로 입력해 주세요.` });
      return;
    }
    onAdd(selected, Math.round(value * 100) / 100);
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
        <Pressable style={{ position: 'absolute', inset: 0 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: t.colors.bg,
            borderTopLeftRadius: t.radius.xl,
            borderTopRightRadius: t.radius.xl,
            borderTopWidth: 1,
            borderColor: t.colors.border,
            paddingHorizontal: t.spacing.lg,
            paddingTop: t.spacing.lg,
            paddingBottom: t.spacing.xl,
            maxHeight: '85%',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: t.spacing.md }}>
            <Text style={{ color: t.colors.fg, fontSize: t.fontSize.title, fontWeight: '700' }}>
              {MEAL_SET_COPY.addItemTitle}
            </Text>
            <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8}>
              <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>{MEAL_SET_COPY.close}</Text>
            </Pressable>
          </View>

          {templates.length === 0 ? (
            <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body, paddingVertical: t.spacing.md }}>
              {MEAL_SET_COPY.templatesEmpty}
            </Text>
          ) : (
            <>
              <TextInput
                value={query}
                onChangeText={(text) => {
                  setQuery(text);
                  setSelected(null);
                }}
                placeholder={MEAL_SET_COPY.searchPlaceholder}
                placeholderTextColor={t.colors.fgSubtle}
                style={{
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  borderRadius: t.radius.md,
                  padding: t.spacing.md,
                  color: t.colors.fg,
                  backgroundColor: t.colors.surface,
                  fontSize: t.fontSize.body,
                  marginBottom: t.spacing.sm,
                }}
              />
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 260 }}>
                {filtered.length === 0 ? (
                  <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body, padding: t.spacing.md }}>
                    {MEAL_SET_COPY.searchEmpty}
                  </Text>
                ) : (
                  filtered.map((tpl) => {
                    const isSel = selected?.id === tpl.id;
                    return (
                      <Pressable
                        key={tpl.id}
                        onPress={() => setSelected(tpl)}
                        style={{
                          padding: t.spacing.md,
                          borderRadius: t.radius.md,
                          borderWidth: 1,
                          borderColor: isSel ? t.colors.primary : t.colors.border,
                          backgroundColor: isSel ? t.colors.surface2 : t.colors.surface,
                          marginBottom: t.spacing.sm,
                        }}
                      >
                        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>{tpl.name}</Text>
                        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                          {Math.round(tpl.calories)} kcal / {tpl.referenceAmount}
                          {templateUnitHint(tpl)}
                        </Text>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>

              {selected ? (
                <View style={{ gap: t.spacing.sm, marginTop: t.spacing.sm }}>
                  <LabeledField
                    label={`${MEAL_SET_COPY.portionLabel} (${templateUnitHint(selected)})`}
                    value={portion}
                    onChangeText={setPortion}
                    keyboardType="decimal-pad"
                    placeholder="1"
                  />
                  <PrimaryButton title={MEAL_SET_COPY.add} onPress={confirm} />
                </View>
              ) : null}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
