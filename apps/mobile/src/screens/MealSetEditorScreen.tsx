import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { listMeals, type FoodTemplateItem, type MealRow } from '../api/meals';
import {
  createMealSet,
  getMealSet,
  updateMealSet,
  type MealSetItemInput,
  type MealSetItemInputMode,
  type MealSetUpsertBody,
} from '../api/mealSets';
import { LabeledField } from '../components/LabeledField';
import { Banner, Card, PrimaryButton, ScreenLayout } from '../components/ui';
import { MEAL_SET_COPY } from '../copy/mealSet';
import { useFocusReload } from '../hooks/useFocusReload';
import {
  macroLabel,
  mealSetItemKcal,
  mealSetItemMacros,
  mealSetItemPortionLabel,
  templateUnitHint,
} from '../lib/mealSetItem';
import { logAppError, toUserMessage } from '../lib/userFacingError';
import type { RootStackParamList } from '../navigation';
import { useTheme } from '../theme';
import { useToast } from '../toast/useToast';

const ITEMS_MAX = 20;
const PORTION_MIN = 0.25;
const PORTION_MAX = 50;

type Nav = NativeStackNavigationProp<RootStackParamList, 'MealSetEditor'>;
type Route = RouteProp<RootStackParamList, 'MealSetEditor'>;

type DraftTemplateItem = {
  key: string;
  kind: 'template';
  foodTemplateId: string;
  mealInputMode: MealSetItemInputMode;
  portionQuantity: number | null;
  totalGrams: number | null;
};

type DraftManualItem = {
  key: string;
  kind: 'manual';
  name: string;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  grams: number | null;
};

type DraftItem = DraftTemplateItem | DraftManualItem;

let draftSeq = 0;
function nextKey(): string {
  draftSeq += 1;
  return `draft-${Date.now()}-${draftSeq}`;
}

/** 과거 식사 기록(MealRow) → 세트 드래프트 항목. 템플릿 기반이면 template, 아니면 manual 스냅샷. */
function mealRowToDraft(meal: MealRow): DraftItem {
  const mode = meal.mealInputMode;
  if (meal.foodTemplateId && (mode === 'PORTION_COUNT' || mode === 'TOTAL_GRAMS')) {
    return {
      key: nextKey(),
      kind: 'template',
      foodTemplateId: meal.foodTemplateId,
      mealInputMode: mode,
      portionQuantity: mode === 'PORTION_COUNT' ? (meal.portionQuantity ?? 1) : null,
      totalGrams: mode === 'TOTAL_GRAMS' ? (meal.grams ?? null) : null,
    };
  }
  return {
    key: nextKey(),
    kind: 'manual',
    name: meal.name,
    calories: meal.calories ?? 0,
    protein: meal.protein ?? 0,
    carbohydrate: meal.carbohydrate ?? 0,
    fat: meal.fat ?? 0,
    grams: meal.grams ?? null,
  };
}

/** mealSetItem 헬퍼에 넘길 분량/칼로리 표시용 어댑터. */
function draftPortionLike(it: DraftItem) {
  if (it.kind === 'manual') {
    return {
      kind: 'manual' as const,
      mealInputMode: null,
      portionQuantity: null,
      totalGrams: null,
      calories: it.calories,
      protein: it.protein,
      carbohydrate: it.carbohydrate,
      fat: it.fat,
      grams: it.grams,
    };
  }
  return { kind: 'template' as const, mealInputMode: it.mealInputMode, portionQuantity: it.portionQuantity, totalGrams: it.totalGrams };
}

export function MealSetEditorScreen() {
  const t = useTheme();
  const toast = useToast();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const editId = route.params?.id;

  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [name, setName] = useState('');
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
        setItems(
          set.items.map((it): DraftItem =>
            it.kind === 'manual'
              ? {
                  key: nextKey(),
                  kind: 'manual',
                  name: it.name ?? '직접 입력 음식',
                  calories: it.calories ?? 0,
                  protein: it.protein ?? 0,
                  carbohydrate: it.carbohydrate ?? 0,
                  fat: it.fat ?? 0,
                  grams: it.grams,
                }
              : {
                  key: nextKey(),
                  kind: 'template',
                  foodTemplateId: it.foodTemplateId ?? '',
                  mealInputMode: it.mealInputMode ?? 'PORTION_COUNT',
                  portionQuantity: it.portionQuantity,
                  totalGrams: it.totalGrams,
                },
          ),
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

  // 추가 성공 여부 반환(모달에서 인라인 "담음" 표시에 사용). 상한 초과 시 false.
  const addDraft = (draft: DraftItem): boolean => {
    let ok = false;
    setItems((prev) => {
      if (prev.length >= ITEMS_MAX) {
        toast.show({ kind: 'error', message: MEAL_SET_COPY.itemsMax(ITEMS_MAX) });
        return prev;
      }
      ok = true;
      return [...prev, draft];
    });
    return ok;
  };

  const addTemplate = (tpl: FoodTemplateItem, portion: number): boolean =>
    addDraft({ key: nextKey(), kind: 'template', foodTemplateId: tpl.id, mealInputMode: 'PORTION_COUNT', portionQuantity: portion, totalGrams: null });

  const addPastMeal = (meal: MealRow): boolean => addDraft(mealRowToDraft(meal));

  const atMax = items.length >= ITEMS_MAX;

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
      const itemInputs: MealSetItemInput[] = items.map((it) =>
        it.kind === 'manual'
          ? {
              kind: 'manual',
              name: it.name,
              calories: it.calories,
              protein: it.protein,
              carbohydrate: it.carbohydrate,
              fat: it.fat,
              ...(it.grams != null ? { grams: it.grams } : {}),
            }
          : {
              kind: 'template',
              foodTemplateId: it.foodTemplateId,
              mealInputMode: it.mealInputMode,
              ...(it.mealInputMode === 'PORTION_COUNT'
                ? { portionQuantity: it.portionQuantity ?? 1 }
                : { totalGrams: it.totalGrams ?? 0 }),
            },
      );
      const body: MealSetUpsertBody = {
        name: name.trim(),
        // 끼니는 세트에 고정하지 않고 등록 시 선택한다. 서버 계약 호환을 위해 안전한 placeholder만 전송.
        defaultMealSlot: 'BREAKFAST',
        defaultSnackPlacement: null,
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
          <Text style={{ color: t.colors.fg, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>
            {MEAL_SET_COPY.itemsTitle}
          </Text>
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>{MEAL_SET_COPY.itemsHint}</Text>
          <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption, marginTop: 2 }}>
            {MEAL_SET_COPY.slotAtApplyHint}
          </Text>

          {items.length === 0 ? (
            <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body, paddingVertical: t.spacing.sm }}>
              {MEAL_SET_COPY.itemsEmpty}
            </Text>
          ) : (
            items.map((it) => {
              const isManual = it.kind === 'manual';
              const tpl = !isManual && it.foodTemplateId ? tplById.get(it.foodTemplateId) : undefined;
              const like = draftPortionLike(it);
              const unavailable = !isManual && !tpl;
              const kcal = mealSetItemKcal(like, tpl);
              const macros = mealSetItemMacros(like, tpl);
              const displayName = isManual ? it.name : (tpl?.name ?? '삭제된 음식');
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
                        {displayName}
                      </Text>
                      {isManual ? (
                        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, fontWeight: '600' }}>
                          {MEAL_SET_COPY.manualBadge}
                        </Text>
                      ) : null}
                      {unavailable ? (
                        <Text style={{ color: t.colors.warn, fontSize: t.fontSize.caption, fontWeight: '600' }}>
                          {MEAL_SET_COPY.itemUnavailable}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                      {mealSetItemPortionLabel(like, tpl)}
                      {kcal != null ? ` · ${kcal} kcal` : ''}
                    </Text>
                    {macros ? (
                      <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>
                        {macroLabel(macros)}
                      </Text>
                    ) : null}
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
              disabled={atMax}
            />
          </View>
        </Card>

        <PrimaryButton title={MEAL_SET_COPY.save} onPress={() => void save()} loading={saving} />
      </ScreenLayout>

      <AddItemModal
        visible={addOpen}
        templates={templates}
        atMax={atMax}
        onClose={() => setAddOpen(false)}
        onAddTemplate={addTemplate}
        onAddPast={addPastMeal}
      />
    </>
  );
}

type AddSource = 'recent' | 'search';

function AddItemModal({
  visible,
  templates,
  atMax,
  onClose,
  onAddTemplate,
  onAddPast,
}: {
  visible: boolean;
  templates: FoodTemplateItem[];
  atMax: boolean;
  onClose: () => void;
  onAddTemplate: (tpl: FoodTemplateItem, portion: number) => boolean;
  onAddPast: (meal: MealRow) => boolean;
}) {
  const t = useTheme();
  const toast = useToast();
  const [source, setSource] = useState<AddSource>('recent');
  const [added, setAdded] = useState<Record<string, number>>({});

  useEffect(() => {
    if (visible) setAdded({});
  }, [visible]);

  const totalAdded = useMemo(() => Object.values(added).reduce((a, b) => a + b, 0), [added]);

  const bump = (id: string) => setAdded((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));

  const handlePast = (meal: MealRow) => {
    if (onAddPast(meal)) bump(meal.mealId);
  };
  const handleTemplate = (tpl: FoodTemplateItem, portion: string) => {
    const value = Number(String(portion).replace(',', '.'));
    if (!Number.isFinite(value) || value < PORTION_MIN || value > PORTION_MAX) {
      toast.show({ kind: 'error', message: `분량은 ${PORTION_MIN}~${PORTION_MAX} 사이로 입력해 주세요.` });
      return;
    }
    if (onAddTemplate(tpl, Math.round(value * 100) / 100)) bump(tpl.id);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
              <Text style={{ color: totalAdded > 0 ? t.colors.primary : t.colors.fgMuted, fontSize: t.fontSize.body, fontWeight: totalAdded > 0 ? '700' : '400' }}>
                {MEAL_SET_COPY.addDone(totalAdded)}
              </Text>
            </Pressable>
          </View>

          {/* 소스 탭 */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: t.colors.surface2,
              borderRadius: t.radius.md,
              padding: 3,
              marginBottom: t.spacing.md,
            }}
          >
            {([
              { key: 'recent' as const, label: MEAL_SET_COPY.sourceRecent },
              { key: 'search' as const, label: MEAL_SET_COPY.sourceSearch },
            ]).map((tab) => {
              const active = source === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setSource(tab.key)}
                  accessibilityRole="button"
                  style={{
                    flex: 1,
                    paddingVertical: t.spacing.sm,
                    borderRadius: t.radius.sm,
                    alignItems: 'center',
                    backgroundColor: active ? t.colors.bg : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      color: active ? t.colors.fg : t.colors.fgMuted,
                      fontSize: t.fontSize.body,
                      fontWeight: active ? '700' : '500',
                    }}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {atMax ? (
            <Text style={{ color: t.colors.warn, fontSize: t.fontSize.caption, marginBottom: t.spacing.sm }}>
              {MEAL_SET_COPY.itemsMax(ITEMS_MAX)}
            </Text>
          ) : null}

          {source === 'recent' ? (
            <RecentSource disabled={atMax} added={added} onPick={handlePast} />
          ) : (
            <SearchSource templates={templates} disabled={atMax} added={added} onAdd={handleTemplate} />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const RECENT_FETCH_SIZE = 60;

/** 최근 먹은 기록 소스: 최근 식사를 (템플릿/이름) 기준 중복 제거해 한 번 탭으로 담기. */
function RecentSource({
  disabled,
  added,
  onPick,
}: {
  disabled: boolean;
  added: Record<string, number>;
  onPick: (meal: MealRow) => void;
}) {
  const t = useTheme();
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [meals, setMeals] = useState<MealRow[]>([]);

  const load = useCallback(async () => {
    setState('loading');
    const token = await ensureAccessToken();
    if (!token) return;
    try {
      const res = await listMeals(token, { page: 1, size: RECENT_FETCH_SIZE });
      // 최근순 정렬 후 (템플릿ID 또는 정규화된 이름) 기준 중복 제거
      const seen = new Set<string>();
      const unique: MealRow[] = [];
      for (const m of res.items ?? []) {
        const key = m.foodTemplateId ?? `name:${m.name.trim().toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(m);
      }
      setMeals(unique);
      setState('ready');
    } catch (e) {
      if (isAuthDenied(e)) return;
      logAppError('[MealSetEditor] recent', e);
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === 'loading') {
    return (
      <View style={{ paddingVertical: t.spacing.xl, alignItems: 'center', gap: t.spacing.sm }}>
        <ActivityIndicator color={t.colors.primary} />
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>{MEAL_SET_COPY.recentLoading}</Text>
      </View>
    );
  }
  if (state === 'error') {
    return (
      <View style={{ paddingVertical: t.spacing.lg, gap: t.spacing.sm }}>
        <Text style={{ color: t.colors.danger, fontSize: t.fontSize.body }}>{MEAL_SET_COPY.recentError}</Text>
        <PrimaryButton title={MEAL_SET_COPY.retry} variant="secondary" onPress={() => void load()} />
      </View>
    );
  }
  if (meals.length === 0) {
    return (
      <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body, paddingVertical: t.spacing.md }}>
        {MEAL_SET_COPY.recentEmpty}
      </Text>
    );
  }

  return (
    <>
      <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, marginBottom: t.spacing.sm }}>
        {MEAL_SET_COPY.recentHint}
      </Text>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 360 }}>
        {meals.map((m) => {
          const count = added[m.mealId] ?? 0;
          return (
            <Pressable
              key={m.mealId}
              onPress={() => onPick(m)}
              disabled={disabled}
              accessibilityRole="button"
              style={{
                padding: t.spacing.md,
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: count > 0 ? t.colors.primary : t.colors.border,
                backgroundColor: count > 0 ? t.colors.surface2 : t.colors.surface,
                marginBottom: t.spacing.sm,
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                <Text numberOfLines={1} style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600', flex: 1 }}>
                  {m.name}
                </Text>
                {!m.foodTemplateId ? (
                  <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, fontWeight: '600' }}>
                    {MEAL_SET_COPY.manualBadge}
                  </Text>
                ) : null}
                {count > 0 ? (
                  <Text style={{ color: t.colors.primary, fontSize: t.fontSize.caption, fontWeight: '700' }}>
                    {MEAL_SET_COPY.addedCount(count)}
                  </Text>
                ) : null}
              </View>
              <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                {m.grams != null ? `${Math.round(m.grams)}g · ` : ''}
                {Math.round(m.calories)} kcal
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}

/** 음식 검색 소스: 템플릿 검색 → 분량 지정 → 추가. */
function SearchSource({
  templates,
  disabled,
  added,
  onAdd,
}: {
  templates: FoodTemplateItem[];
  disabled: boolean;
  added: Record<string, number>;
  onAdd: (tpl: FoodTemplateItem, portion: string) => void;
}) {
  const t = useTheme();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<FoodTemplateItem | null>(null);
  const [portion, setPortion] = useState('1');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return templates.slice(0, 50);
    return templates.filter((tpl) => tpl.name.toLowerCase().includes(needle)).slice(0, 50);
  }, [query, templates]);

  if (templates.length === 0) {
    return (
      <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body, paddingVertical: t.spacing.md }}>
        {MEAL_SET_COPY.templatesEmpty}
      </Text>
    );
  }

  return (
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
            const count = added[tpl.id] ?? 0;
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                  <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600', flex: 1 }}>{tpl.name}</Text>
                  {count > 0 ? (
                    <Text style={{ color: t.colors.primary, fontSize: t.fontSize.caption, fontWeight: '700' }}>
                      {MEAL_SET_COPY.addedCount(count)}
                    </Text>
                  ) : null}
                </View>
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
          <PrimaryButton
            title={MEAL_SET_COPY.add}
            disabled={disabled}
            onPress={() => onAdd(selected, portion)}
          />
        </View>
      ) : null}
    </>
  );
}
