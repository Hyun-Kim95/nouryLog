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
import { listMeals, type FoodTemplateItem, type MealEntrySuggestionItem, type MealRow } from '../api/meals';
import {
  createMealSet,
  getMealSet,
  updateMealSet,
  type MealSetItemInput,
  type MealSetUpsertBody,
} from '../api/mealSets';
import { LabeledField } from '../components/LabeledField';
import { Banner, Card, PrimaryButton, ScreenLayout } from '../components/ui';
import { MEAL_SET_COPY } from '../copy/mealSet';
import { useBottomSafeInset } from '../hooks/useBottomSafeInset';
import { useFocusReload } from '../hooks/useFocusReload';
import {
  mealEntrySuggestionsErrorMessage,
  useMealEntrySuggestions,
} from '../hooks/useMealEntrySuggestions';
import {
  macroLabel,
  mealSetItemKcal,
  mealSetItemMacros,
  mealSetItemPortionLabel,
  type Macros,
} from '../lib/mealSetItem';
import { logAppError, toUserMessage } from '../lib/userFacingError';
import type { RootStackParamList } from '../navigation';
import { useTheme } from '../theme';
import { useToast } from '../toast/useToast';

const ITEMS_MAX = 20;
const QTY_MAX = 50;

type Nav = NativeStackNavigationProp<RootStackParamList, 'MealSetEditor'>;
type Route = RouteProp<RootStackParamList, 'MealSetEditor'>;

/** 세트 항목 드래프트. qty = 인분 수(템플릿) 또는 배수(수기). 음식당 식사 1건으로 등록된다. */
type DraftTemplateItem = {
  key: string;
  kind: 'template';
  foodTemplateId: string;
  qty: number;
};

type DraftManualItem = {
  key: string;
  kind: 'manual';
  name: string;
  /** 1배수 기준 스냅샷. 표시·저장 시 qty를 곱한다. */
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  grams: number | null;
  qty: number;
};

type DraftItem = DraftTemplateItem | DraftManualItem;

/** 추가/증감 시 넘기는 페이로드. */
type AddPayload =
  | { kind: 'template'; foodTemplateId: string }
  | {
      kind: 'manual';
      name: string;
      calories: number;
      protein: number;
      carbohydrate: number;
      fat: number;
      grams: number | null;
    };

let draftSeq = 0;
function nextKey(): string {
  draftSeq += 1;
  return `draft-${Date.now()}-${draftSeq}`;
}

function identityOf(p: AddPayload | DraftItem): string {
  return p.kind === 'template'
    ? `tpl:${p.foodTemplateId}`
    : `manual:${p.name.trim().toLowerCase()}`;
}

/** mealSetItem 헬퍼에 넘길 분량/영양 표시용 어댑터 (qty 반영). */
function draftPortionLike(it: DraftItem) {
  if (it.kind === 'manual') {
    return {
      kind: 'manual' as const,
      mealInputMode: null,
      portionQuantity: null,
      totalGrams: null,
      calories: it.calories * it.qty,
      protein: it.protein * it.qty,
      carbohydrate: it.carbohydrate * it.qty,
      fat: it.fat * it.qty,
      grams: it.grams != null ? it.grams * it.qty : null,
    };
  }
  return {
    kind: 'template' as const,
    mealInputMode: 'PORTION_COUNT' as const,
    portionQuantity: it.qty,
    totalGrams: null,
  };
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

  const qtyByIdentity = useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of items) m[identityOf(it)] = it.qty;
    return m;
  }, [items]);

  const load = useCallback(async () => {
    setState('loading');
    const token = await ensureAccessToken();
    if (!token) return;
    try {
      const tplRes = await apiFetch<{ items: FoodTemplateItem[] }>(
        '/me/food-templates?page=1&size=100',
        { token },
      );
      const tplList = tplRes.items ?? [];
      setTemplates(tplList);
      if (editId) {
        const set = await getMealSet(token, editId);
        setName(set.name);
        setItems(
          set.items.map((it): DraftItem => {
            if (it.kind === 'manual') {
              return {
                key: nextKey(),
                kind: 'manual',
                name: it.name ?? '직접 입력 음식',
                calories: it.calories ?? 0,
                protein: it.protein ?? 0,
                carbohydrate: it.carbohydrate ?? 0,
                fat: it.fat ?? 0,
                grams: it.grams,
                qty: 1,
              };
            }
            // 템플릿: 인분 기반으로 통일. 레거시 TOTAL_GRAMS는 servingGrams로 인분 환산.
            const tpl = it.foodTemplateId ? tplList.find((x) => x.id === it.foodTemplateId) : undefined;
            let qty = 1;
            if (it.mealInputMode === 'TOTAL_GRAMS') {
              if (it.totalGrams != null && tpl && tpl.servingGrams > 0) {
                qty = Math.max(1, Math.round(it.totalGrams / tpl.servingGrams));
              }
            } else {
              qty = Math.max(1, Math.round(it.portionQuantity ?? 1));
            }
            return {
              key: nextKey(),
              kind: 'template',
              foodTemplateId: it.foodTemplateId ?? '',
              qty,
            };
          }),
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

  const atMax = items.length >= ITEMS_MAX;

  /** 동일 식별 항목이 있으면 +1, 없으면 신규. 상한 초과 시 토스트. */
  const addOrInc = useCallback(
    (payload: AddPayload) => {
      const id = identityOf(payload);
      setItems((prev) => {
        const idx = prev.findIndex((it) => identityOf(it) === id);
        if (idx >= 0) {
          const cur = prev[idx];
          if (cur.qty >= QTY_MAX) {
            toast.show({ kind: 'error', message: MEAL_SET_COPY.qtyMax(QTY_MAX) });
            return prev;
          }
          const next = [...prev];
          next[idx] = { ...cur, qty: cur.qty + 1 };
          return next;
        }
        if (prev.length >= ITEMS_MAX) {
          toast.show({ kind: 'error', message: MEAL_SET_COPY.itemsMax(ITEMS_MAX) });
          return prev;
        }
        const draft: DraftItem =
          payload.kind === 'template'
            ? { key: nextKey(), kind: 'template', foodTemplateId: payload.foodTemplateId, qty: 1 }
            : {
                key: nextKey(),
                kind: 'manual',
                name: payload.name,
                calories: payload.calories,
                protein: payload.protein,
                carbohydrate: payload.carbohydrate,
                fat: payload.fat,
                grams: payload.grams,
                qty: 1,
              };
        return [...prev, draft];
      });
    },
    [toast],
  );

  /** 식별 키로 -1, 1이면 제거. */
  const decByIdentity = useCallback((id: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((it) => identityOf(it) === id);
      if (idx < 0) return prev;
      const cur = prev[idx];
      if (cur.qty <= 1) return prev.filter((_, i) => i !== idx);
      const next = [...prev];
      next[idx] = { ...cur, qty: cur.qty - 1 };
      return next;
    });
  }, []);

  const incByKey = (key: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.key === key);
      if (idx < 0) return prev;
      const cur = prev[idx];
      if (cur.qty >= QTY_MAX) {
        toast.show({ kind: 'error', message: MEAL_SET_COPY.qtyMax(QTY_MAX) });
        return prev;
      }
      const next = [...prev];
      next[idx] = { ...cur, qty: cur.qty + 1 };
      return next;
    });
  };

  const decByKey = (key: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.key === key);
      if (idx < 0) return prev;
      const cur = prev[idx];
      if (cur.qty <= 1) return prev.filter((_, i) => i !== idx);
      const next = [...prev];
      next[idx] = { ...cur, qty: cur.qty - 1 };
      return next;
    });
  };

  const removeByKey = (key: string) => setItems((prev) => prev.filter((it) => it.key !== key));

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
              calories: Math.round(it.calories * it.qty),
              protein: Math.round(it.protein * it.qty),
              carbohydrate: Math.round(it.carbohydrate * it.qty),
              fat: Math.round(it.fat * it.qty),
              ...(it.grams != null ? { grams: Math.round(it.grams * it.qty) } : {}),
            }
          : {
              kind: 'template',
              foodTemplateId: it.foodTemplateId,
              mealInputMode: 'PORTION_COUNT',
              portionQuantity: it.qty,
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
                  <QtyStepper
                    qty={it.qty}
                    onDec={() => decByKey(it.key)}
                    onInc={() => incByKey(it.key)}
                    incDisabled={it.qty >= QTY_MAX}
                  />
                  <Pressable onPress={() => removeByKey(it.key)} accessibilityRole="button" hitSlop={6}>
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
            />
          </View>
        </Card>

        <PrimaryButton title={MEAL_SET_COPY.save} onPress={() => void save()} loading={saving} />
      </ScreenLayout>

      <AddItemModal
        visible={addOpen}
        atMax={atMax}
        qtyByIdentity={qtyByIdentity}
        onClose={() => setAddOpen(false)}
        onInc={addOrInc}
        onDec={decByIdentity}
      />
    </>
  );
}

/** 개수 증감 스테퍼 (− n +). */
function QtyStepper({
  qty,
  onDec,
  onInc,
  incDisabled,
}: {
  qty: number;
  onDec: () => void;
  onInc: () => void;
  incDisabled?: boolean;
}) {
  const t = useTheme();
  const btn = (label: string, onPress: () => void, disabled: boolean, a11y: string) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      hitSlop={6}
      style={{
        width: 30,
        height: 30,
        borderRadius: t.radius.sm,
        borderWidth: 1,
        borderColor: t.colors.border,
        backgroundColor: t.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs }}>
      {btn('−', onDec, false, MEAL_SET_COPY.decrease)}
      <Text
        style={{
          minWidth: 28,
          textAlign: 'center',
          color: t.colors.fg,
          fontSize: t.fontSize.body,
          fontWeight: '700',
        }}
      >
        {qty}
      </Text>
      {btn('+', onInc, !!incDisabled, MEAL_SET_COPY.increase)}
    </View>
  );
}

function AddItemModal({
  visible,
  atMax,
  qtyByIdentity,
  onClose,
  onInc,
  onDec,
}: {
  visible: boolean;
  atMax: boolean;
  qtyByIdentity: Record<string, number>;
  onClose: () => void;
  onInc: (payload: AddPayload) => void;
  onDec: (identity: string) => void;
}) {
  const t = useTheme();
  const bottomInset = useBottomSafeInset();
  const [query, setQuery] = useState('');
  const trimmed = query.trim();

  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const totalAdded = useMemo(
    () => Object.values(qtyByIdentity).reduce((a, b) => a + b, 0),
    [qtyByIdentity],
  );

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
            paddingBottom: t.spacing.xl + bottomInset,
            maxHeight: '85%',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: t.spacing.md }}>
            <Text style={{ color: t.colors.fg, fontSize: t.fontSize.title, fontWeight: '700' }}>
              {MEAL_SET_COPY.addItemTitle}
            </Text>
            <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8}>
              <Text
                style={{
                  color: totalAdded > 0 ? t.colors.primary : t.colors.fgMuted,
                  fontSize: t.fontSize.body,
                  fontWeight: totalAdded > 0 ? '700' : '400',
                }}
              >
                {MEAL_SET_COPY.addDone(totalAdded)}
              </Text>
            </Pressable>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={MEAL_SET_COPY.searchAllPlaceholder}
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

          {atMax ? (
            <Text style={{ color: t.colors.warn, fontSize: t.fontSize.caption, marginBottom: t.spacing.sm }}>
              {MEAL_SET_COPY.itemsMax(ITEMS_MAX)}
            </Text>
          ) : null}

          {trimmed.length === 0 ? (
            <RecentSource atMax={atMax} qtyByIdentity={qtyByIdentity} onInc={onInc} onDec={onDec} />
          ) : (
            <SearchSource query={trimmed} atMax={atMax} qtyByIdentity={qtyByIdentity} onInc={onInc} onDec={onDec} />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** MealRow → 추가 페이로드(템플릿 기반이면 template, 아니면 manual 스냅샷). */
function mealRowToPayload(m: MealRow): AddPayload {
  if (m.foodTemplateId) {
    return { kind: 'template', foodTemplateId: m.foodTemplateId };
  }
  return {
    kind: 'manual',
    name: m.name,
    calories: m.calories ?? 0,
    protein: m.protein ?? 0,
    carbohydrate: m.carbohydrate ?? 0,
    fat: m.fat ?? 0,
    grams: m.grams ?? null,
  };
}

const RECENT_FETCH_SIZE = 60;

/** 검색어가 없을 때: 최근 식사 기록을 (템플릿/이름) 기준 중복 제거해 보여준다. */
function RecentSource({
  atMax,
  qtyByIdentity,
  onInc,
  onDec,
}: {
  atMax: boolean;
  qtyByIdentity: Record<string, number>;
  onInc: (payload: AddPayload) => void;
  onDec: (identity: string) => void;
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
        {MEAL_SET_COPY.recentSectionTitle}
      </Text>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 360 }}>
        {meals.map((m) => {
          const payload = mealRowToPayload(m);
          const id = identityOf(payload);
          const macros: Macros = {
            protein: Math.round(m.protein ?? 0),
            carbohydrate: Math.round(m.carbohydrate ?? 0),
            fat: Math.round(m.fat ?? 0),
          };
          return (
            <ResultRow
              key={m.mealId}
              name={m.name}
              isManual={!m.foodTemplateId}
              kcal={Math.round(m.calories ?? 0)}
              macros={macros}
              qty={qtyByIdentity[id] ?? 0}
              atMax={atMax}
              onInc={() => onInc(payload)}
              onDec={() => onDec(id)}
            />
          );
        })}
      </ScrollView>
    </>
  );
}

/** 검색어가 있을 때: 과거 기록 + 음식 템플릿 통합 검색. */
function SearchSource({
  query,
  atMax,
  qtyByIdentity,
  onInc,
  onDec,
}: {
  query: string;
  atMax: boolean;
  qtyByIdentity: Record<string, number>;
  onInc: (payload: AddPayload) => void;
  onDec: (identity: string) => void;
}) {
  const t = useTheme();
  const { items, status, errorKind } = useMealEntrySuggestions(query, true);

  if (status === 'loading' || status === 'idle') {
    return (
      <View style={{ paddingVertical: t.spacing.xl, alignItems: 'center', gap: t.spacing.sm }}>
        <ActivityIndicator color={t.colors.primary} />
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>{MEAL_SET_COPY.searchLoading}</Text>
      </View>
    );
  }
  if (status === 'error') {
    return (
      <Text style={{ color: t.colors.danger, fontSize: t.fontSize.body, paddingVertical: t.spacing.md }}>
        {mealEntrySuggestionsErrorMessage(errorKind)}
      </Text>
    );
  }
  if (items.length === 0) {
    return (
      <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body, paddingVertical: t.spacing.md }}>
        {MEAL_SET_COPY.searchEmpty}
      </Text>
    );
  }

  return (
    <>
      <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, marginBottom: t.spacing.sm }}>
        {MEAL_SET_COPY.searchSectionTitle}
      </Text>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 360 }}>
        {items.map((it, idx) => {
          const row = suggestionToRow(it);
          return (
            <ResultRow
              key={`${row.id}-${idx}`}
              name={row.name}
              isManual={row.isManual}
              kcal={row.kcal}
              macros={row.macros}
              qty={qtyByIdentity[row.id] ?? 0}
              atMax={atMax}
              onInc={() => onInc(row.payload)}
              onDec={() => onDec(row.id)}
            />
          );
        })}
      </ScrollView>
    </>
  );
}

function suggestionToRow(it: MealEntrySuggestionItem): {
  id: string;
  name: string;
  isManual: boolean;
  kcal: number;
  macros: Macros;
  payload: AddPayload;
} {
  if (it.kind === 'template') {
    const tpl = it.template;
    const payload: AddPayload = { kind: 'template', foodTemplateId: tpl.id };
    return {
      id: identityOf(payload),
      name: tpl.name,
      isManual: false,
      kcal: Math.round(tpl.calories ?? 0),
      macros: {
        protein: Math.round(tpl.protein ?? 0),
        carbohydrate: Math.round(tpl.carbohydrate ?? 0),
        fat: Math.round(tpl.fat ?? 0),
      },
      payload,
    };
  }
  const m = it.meal;
  const payload = mealRowToPayload(m);
  return {
    id: identityOf(payload),
    name: m.name,
    isManual: !m.foodTemplateId,
    kcal: Math.round(m.calories ?? 0),
    macros: {
      protein: Math.round(m.protein ?? 0),
      carbohydrate: Math.round(m.carbohydrate ?? 0),
      fat: Math.round(m.fat ?? 0),
    },
    payload,
  };
}

/** 검색/최근 공통 결과 행: 이름·영양 + 우측 담기/스테퍼. */
function ResultRow({
  name,
  isManual,
  kcal,
  macros,
  qty,
  atMax,
  onInc,
  onDec,
}: {
  name: string;
  isManual: boolean;
  kcal: number;
  macros: Macros;
  qty: number;
  atMax: boolean;
  onInc: () => void;
  onDec: () => void;
}) {
  const t = useTheme();
  const addDisabled = qty === 0 ? atMax : qty >= QTY_MAX;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.sm,
        padding: t.spacing.md,
        borderRadius: t.radius.md,
        borderWidth: 1,
        borderColor: qty > 0 ? t.colors.primary : t.colors.border,
        backgroundColor: qty > 0 ? t.colors.surface2 : t.colors.surface,
        marginBottom: t.spacing.sm,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
          <Text numberOfLines={1} style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600', flexShrink: 1 }}>
            {name}
          </Text>
          {isManual ? (
            <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, fontWeight: '600' }}>
              {MEAL_SET_COPY.manualBadge}
            </Text>
          ) : null}
        </View>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>{kcal} kcal</Text>
        <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>{macroLabel(macros)}</Text>
      </View>
      {qty > 0 ? (
        <QtyStepper qty={qty} onDec={onDec} onInc={onInc} incDisabled={qty >= QTY_MAX} />
      ) : (
        <Pressable
          onPress={onInc}
          disabled={addDisabled}
          accessibilityRole="button"
          style={{
            paddingHorizontal: t.spacing.md,
            paddingVertical: t.spacing.sm,
            borderRadius: t.radius.sm,
            backgroundColor: t.colors.primary,
            opacity: addDisabled ? 0.4 : 1,
          }}
        >
          <Text style={{ color: t.colors.primaryFg, fontSize: t.fontSize.caption, fontWeight: '700' }}>
            {MEAL_SET_COPY.addCta}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
