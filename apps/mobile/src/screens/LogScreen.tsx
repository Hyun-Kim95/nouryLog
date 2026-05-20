import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { resolveImagePickerBase64 } from '../lib/imagePickerBase64';
import { apiFetch, isAuthDenied } from '../api';
import {
  createMeal,
  deactivateMeal,
  listMeals,
  updateMeal,
  type FoodTemplateItem,
  type MealRow,
  type TemplateInputMode,
} from '../api/meals';
import { ensureAccessToken } from '../authSession';
import { getAccessToken } from '../authStorage';
import { LabeledField } from '../components/LabeledField';
import { RadioGroup } from '../components/RadioGroup';
import { Segmented } from '../components/Segmented';
import {
  Banner,
  Card,
  CardTitle,
  Chip,
  PaywallModal,
  PrimaryButton,
  ScreenLayout,
  TextButton,
} from '../components/ui';
import { BILLING_COPY } from '../copy/billing';
import { LOG_COPY } from '../copy/log';
import { useFocusReload } from '../hooks/useFocusReload';
import { formatMacroLine } from '../lib/formatNutrition';
import { parseManualNutrition } from '../lib/manualNutrition';
import { localDayBounds, localDayStartExclusiveUpperBound } from '../lib/dateRange';
import { groupMealsForTodayTimeline, mealRowSubtitle } from '../lib/mealTimeline';
import {
  defaultMealSlotForNow,
  defaultSnackPlacementForNow,
  MEAL_SLOT_OPTIONS,
  SNACK_PLACEMENT_OPTIONS,
  type MealSlot,
  type SnackPlacement,
} from '../lib/mealSlot';
import { useTheme } from '../theme';
import { useToast } from '../toast/useToast';

type Ent = {
  ocrQuotaLimit: number;
  ocrQuotaUsed: number;
  ocrPaidEnabled: boolean;
  nextPaywallTrigger: 'none' | 'ocr_remaining_1' | 'ocr_exhausted';
};

type LastOcrMeta = {
  confidence: number;
};

function unitHint(tpl: FoodTemplateItem): string {
  if (tpl.portionUnit === 'GRAM') return 'g';
  if (tpl.portionLabel) return tpl.portionLabel;
  if (tpl.portionUnit === 'PIECE') return '개';
  if (tpl.portionUnit === 'PLATE') return '접시';
  if (tpl.portionUnit === 'BOWL') return '공기';
  return '단위';
}

function baselineSummary(tpl: FoodTemplateItem): string {
  if (tpl.portionUnit === 'GRAM') return `${tpl.referenceAmount}g`;
  return `${tpl.referenceAmount}${unitHint(tpl)}`;
}

function formatTplAmount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function defaultTplAmount(tpl: FoodTemplateItem, mode: TemplateInputMode): string {
  if (mode === 'TOTAL_GRAMS') return formatTplAmount(tpl.servingGrams) || '1';
  return '1';
}

function tplAmountFromMeal(m: MealRow, tpl: FoodTemplateItem): string {
  const mode = m.mealInputMode === 'TOTAL_GRAMS' ? 'TOTAL_GRAMS' : 'PORTION_COUNT';
  if (mode === 'PORTION_COUNT' && m.portionQuantity != null) {
    return formatTplAmount(m.portionQuantity) || '1';
  }
  if (mode === 'TOTAL_GRAMS' && m.grams != null && m.grams > 0) {
    return formatTplAmount(m.grams);
  }
  return defaultTplAmount(tpl, mode);
}

const PAST_PAGE_SIZE = 10;
const NAME_SUGGEST_LIMIT = 8;

function mealSuggestionPool(...groups: MealRow[][]): MealRow[] {
  const byName = new Map<string, MealRow>();
  for (const group of groups) {
    for (const m of group) {
      const key = m.name.trim().toLowerCase();
      if (!key || byName.has(key)) continue;
      byName.set(key, m);
    }
  }
  return [...byName.values()];
}

const EMPTY_FORM = {
  name: '',
  calories: '',
  protein: '',
  carbohydrate: '',
  fat: '',
  mealSlot: defaultMealSlotForNow() as MealSlot,
  selectedTpl: null as FoodTemplateItem | null,
  mealInputMode: 'PORTION_COUNT' as TemplateInputMode,
  tplAmount: '1',
  consumedAt: new Date().toISOString(),
};

export function LogScreen() {
  const t = useTheme();
  const toast = useToast();
  const [items, setItems] = useState<MealRow[]>([]);
  const [pastMeals, setPastMeals] = useState<MealRow[]>([]);
  const [pastPage, setPastPage] = useState(1);
  const [pastHasMore, setPastHasMore] = useState(false);
  const [pastLoadingMore, setPastLoadingMore] = useState(false);
  const pastLoadMoreLock = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const entrySectionY = useRef(0);
  const [recentMeals, setRecentMeals] = useState<MealRow[]>([]);
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbohydrate, setCarbohydrate] = useState('');
  const [fat, setFat] = useState('');
  const [mealSlot, setMealSlot] = useState<MealSlot>(() => defaultMealSlotForNow());
  const [snackPlacement, setSnackPlacement] = useState<SnackPlacement>(() => defaultSnackPlacementForNow());
  const [consumedAt, setConsumedAt] = useState(EMPTY_FORM.consumedAt);
  const [ent, setEnt] = useState<Ent | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [lastOcrMeta, setLastOcrMeta] = useState<LastOcrMeta | null>(null);

  const [templates, setTemplates] = useState<FoodTemplateItem[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [selectedTpl, setSelectedTpl] = useState<FoodTemplateItem | null>(null);
  const [mealInputMode, setMealInputMode] = useState<TemplateInputMode>('PORTION_COUNT');
  const [tplAmount, setTplAmount] = useState('1');
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [nameFocused, setNameFocused] = useState(false);

  const scrollToEntrySection = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          y: Math.max(0, entrySectionY.current - 12),
          animated: true,
        });
      });
    });
  }, []);

  const scheduleScrollToEntry = useCallback(() => {
    scrollToEntrySection();
  }, [scrollToEntrySection]);

  const focusEntryField = useCallback(() => {
    scheduleScrollToEntry();
  }, [scheduleScrollToEntry]);

  const switchToManualEntry = useCallback(() => {
    setSelectedTpl(null);
    setMealInputMode('PORTION_COUNT');
    setTplAmount('1');
    setName('');
    setCalories('');
    setProtein('');
    setCarbohydrate('');
    setFat('');
    setLastOcrMeta(null);
  }, []);

  const resetForm = useCallback(() => {
    setEditingMealId(null);
    setName(EMPTY_FORM.name);
    setCalories(EMPTY_FORM.calories);
    setProtein(EMPTY_FORM.protein);
    setCarbohydrate(EMPTY_FORM.carbohydrate);
    setFat(EMPTY_FORM.fat);
    setMealSlot(defaultMealSlotForNow());
    setSnackPlacement(defaultSnackPlacementForNow());
    setConsumedAt(new Date().toISOString());
    setSelectedTpl(null);
    setMealInputMode('PORTION_COUNT');
    setTplAmount('1');
    setLastOcrMeta(null);
  }, []);

  const loadEntitlements = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    try {
      const e = await apiFetch<Ent>('/me/billing/entitlements', { token });
      setEnt(e);
    } catch {
      setEnt(null);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    setTplLoading(true);
    try {
      const res = await apiFetch<{ items: FoodTemplateItem[] }>('/me/food-templates?page=1&size=100', {
        token,
      });
      setTemplates(res.items ?? []);
    } catch {
      setTemplates([]);
    } finally {
      setTplLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    const token = await ensureAccessToken();
    if (!token) return;
    try {
      const { from, to } = localDayBounds();
      const pastTo = localDayStartExclusiveUpperBound();
      const [todayRes, pastRes, recent] = await Promise.all([
        listMeals(token, { page: 1, size: 100, from, to }),
        listMeals(token, { page: 1, size: PAST_PAGE_SIZE, to: pastTo }),
        listMeals(token, { page: 1, size: 30, excludeFoodTemplate: true }),
      ]);
      setItems(todayRes.items ?? []);
      const pastItems = pastRes.items ?? [];
      setPastMeals(pastItems);
      setPastPage(1);
      setPastHasMore(pastItems.length < (pastRes.total ?? 0));
      const seen = new Set<string>();
      const deduped: MealRow[] = [];
      for (const m of recent.items ?? []) {
        const key = `${m.name}|${m.calories}|${m.protein}|${m.carbohydrate}|${m.fat}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(m);
        if (deduped.length >= 12) break;
      }
      setRecentMeals(deduped);
    } catch (e) {
      if (isAuthDenied(e)) return;
      setItems([]);
      setPastMeals([]);
      setPastHasMore(false);
      setRecentMeals([]);
    }
  }, []);

  const loadMorePast = useCallback(async () => {
    if (pastLoadMoreLock.current || !pastHasMore) return;
    const token = await getAccessToken();
    if (!token) return;
    pastLoadMoreLock.current = true;
    setPastLoadingMore(true);
    try {
      const nextPage = pastPage + 1;
      const res = await listMeals(token, {
        page: nextPage,
        size: PAST_PAGE_SIZE,
        to: localDayStartExclusiveUpperBound(),
      });
      const newItems = res.items ?? [];
      setPastMeals((prev) => {
        const merged = [...prev, ...newItems];
        setPastHasMore(merged.length < (res.total ?? 0));
        return merged;
      });
      setPastPage(nextPage);
    } catch (e) {
      if (isAuthDenied(e)) return;
    } finally {
      setPastLoadingMore(false);
      pastLoadMoreLock.current = false;
    }
  }, [pastHasMore, pastPage]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!pastHasMore || pastLoadingMore) return;
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 120;
      if (nearBottom) void loadMorePast();
    },
    [pastHasMore, pastLoadingMore, loadMorePast],
  );

  useFocusReload(
    useCallback(
      async ({ silent }: { silent: boolean }) => {
        await load();
        await loadEntitlements();
        await loadTemplates();
      },
      [load, loadEntitlements, loadTemplates],
    ),
  );

  const mealBodyBase = (): Record<string, unknown> => {
    const base: Record<string, unknown> = {
      mealSlot,
      consumedAt: editingMealId ? consumedAt : new Date().toISOString(),
    };
    if (mealSlot === 'SNACK') {
      base.snackPlacement = snackPlacement;
    } else {
      base.snackPlacement = null;
    }
    return base;
  };

  const buildTemplateBody = (): Record<string, unknown> => {
    if (!selectedTpl) throw new Error('음식 템플릿을 선택해 주세요.');
    const amt = Number(String(tplAmount).replace(',', '.'));
    if (!Number.isFinite(amt) || amt <= 0) throw new Error('수량을 올바르게 입력해 주세요.');
    const body: Record<string, unknown> = {
      ...mealBodyBase(),
      foodTemplateId: selectedTpl.id,
      mealInputMode,
    };
    if (mealInputMode === 'PORTION_COUNT') {
      body.portionQuantity = amt;
    } else {
      body.totalGrams = amt;
    }
    return body;
  };

  const saveMeal = async () => {
    setSaveBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('로그인 필요');
      if (mealSlot === 'SNACK' && !snackPlacement) {
        throw new Error(LOG_COPY.snackPlacementRequired);
      }

      if (selectedTpl) {
        const body = buildTemplateBody();
        if (editingMealId) {
          await updateMeal(token, editingMealId, body);
        } else {
          await createMeal(token, body);
        }
      } else {
        const nutrition = parseManualNutrition({ calories, protein, carbohydrate, fat });
        if (!name.trim()) throw new Error(LOG_COPY.nameRequired);
        const body = {
          ...mealBodyBase(),
          name: name.trim(),
          ...nutrition,
        };
        if (editingMealId) {
          await updateMeal(token, editingMealId, body);
        } else {
          await createMeal(token, body);
        }
      }

      toast.show({
        kind: 'success',
        message: editingMealId ? LOG_COPY.editSuccess : LOG_COPY.saveSuccess,
      });
      resetForm();
      await load();
    } catch (e) {
      if (isAuthDenied(e)) return;
      toast.show({ kind: 'error', message: e instanceof Error ? e.message : '저장 실패' });
    } finally {
      setSaveBusy(false);
    }
  };

  const confirmDelete = () => {
    if (!editingMealId) return;
    Alert.alert(LOG_COPY.deleteConfirmTitle, LOG_COPY.deleteConfirmBody, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => void deleteMeal(),
      },
    ]);
  };

  const deleteMeal = async () => {
    if (!editingMealId) return;
    setSaveBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('로그인 필요');
      await deactivateMeal(token, editingMealId);
      toast.show({ kind: 'success', message: LOG_COPY.deleteSuccess });
      resetForm();
      await load();
    } catch (e) {
      if (isAuthDenied(e)) return;
      toast.show({ kind: 'error', message: e instanceof Error ? e.message : '삭제 실패' });
    } finally {
      setSaveBusy(false);
    }
  };

  const runOcrWithBase64 = async (imageBase64: string) => {
    const token = await getAccessToken();
    if (!token) throw new Error('로그인 필요');
    const res = await apiFetch<{
      calories: number;
      carbohydrate: number;
      protein: number;
      fat: number;
      confidence: number;
      missingFields: string[];
      remainingFreeQuota: number;
    }>('/nutrition/ocr', {
      method: 'POST',
      token,
      body: JSON.stringify({ imageBase64 }),
    });
    setLastOcrMeta({ confidence: res.confidence });
    setSelectedTpl(null);
    setEditingMealId(null);
    setName('');
    setCalories(String(Math.round(res.calories)));
    setProtein(String(Math.round(res.protein)));
    setCarbohydrate(String(Math.round(res.carbohydrate)));
    setFat(String(Math.round(res.fat)));
    await loadEntitlements();
    toast.show({
      kind: 'info',
      message: LOG_COPY.ocrDoneToast(res.remainingFreeQuota),
    });
    scheduleScrollToEntry();
  };

  const pickImage = async (source: 'camera' | 'library') => {
    if (ent?.nextPaywallTrigger === 'ocr_exhausted' && !ent.ocrPaidEnabled) {
      setPaywallOpen(true);
      return;
    }
    setOcrBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('로그인 필요');

      const mediaTypes = ImagePicker.MediaTypeOptions.Images;
      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes,
        quality: 0.8,
        base64: true,
      };

      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) throw new Error('카메라 접근 권한이 필요합니다.');
        const picked = await ImagePicker.launchCameraAsync(pickerOptions);
        if (picked.canceled) {
          toast.show({ kind: 'info', message: LOG_COPY.ocrCameraCanceled });
          return;
        }
        const asset = picked.assets[0];
        if (!asset) {
          toast.show({ kind: 'info', message: LOG_COPY.ocrCameraCanceled });
          return;
        }
        const base64 = await resolveImagePickerBase64(asset);
        if (!base64) throw new Error(LOG_COPY.ocrImageLoadFailed);
        await runOcrWithBase64(base64);
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) throw new Error('갤러리 접근 권한이 필요합니다.');
        const picked = await ImagePicker.launchImageLibraryAsync({
          ...pickerOptions,
          allowsEditing: false,
        });
        if (picked.canceled) {
          toast.show({ kind: 'info', message: LOG_COPY.ocrPickCanceled });
          return;
        }
        const asset = picked.assets[0];
        if (!asset) {
          toast.show({ kind: 'info', message: LOG_COPY.ocrPickCanceled });
          return;
        }
        const base64 = await resolveImagePickerBase64(asset);
        if (!base64) throw new Error(LOG_COPY.ocrImageLoadFailed);
        await runOcrWithBase64(base64);
      }
    } catch (e) {
      if (isAuthDenied(e)) return;
      const msg = e instanceof Error ? e.message : '사진 분석에 실패했어요';
      if (msg.includes('무료') || msg.includes('한도') || msg.includes('OCR')) {
        setPaywallOpen(true);
      }
      toast.show({ kind: 'error', message: msg });
    } finally {
      setOcrBusy(false);
    }
  };

  const checkout = async () => {
    setCheckoutBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('로그인 필요');
      await apiFetch('/me/billing/checkout', {
        method: 'POST',
        token,
        body: JSON.stringify({ productType: 'premium_monthly' }),
      });
      toast.show({ kind: 'success', message: BILLING_COPY.subscribeSuccess });
      setPaywallOpen(false);
      await loadEntitlements();
    } catch (e) {
      if (isAuthDenied(e)) return;
      toast.show({ kind: 'error', message: e instanceof Error ? e.message : BILLING_COPY.actionError });
    } finally {
      setCheckoutBusy(false);
    }
  };

  const applyManualFromMeal = (m: MealRow) => {
    setSelectedTpl(null);
    setLastOcrMeta(null);
    setName(m.name);
    setCalories(String(Math.round(m.calories)));
    setProtein(String(Math.round(m.protein)));
    setCarbohydrate(String(Math.round(m.carbohydrate)));
    setFat(String(Math.round(m.fat)));
    if (m.mealSlot) setMealSlot(m.mealSlot);
    if (m.snackPlacement) setSnackPlacement(m.snackPlacement);
    toast.show({ kind: 'info', message: '입력란에 불러왔어요. 확인 후 저장해 주세요.' });
    scheduleScrollToEntry();
  };

  const applyRecentMeal = (m: MealRow) => {
    if (m.foodTemplateId) {
      const tpl = templates.find((x) => x.id === m.foodTemplateId);
      if (tpl) {
        setSelectedTpl(tpl);
        const mode = m.mealInputMode === 'TOTAL_GRAMS' ? 'TOTAL_GRAMS' : 'PORTION_COUNT';
        setMealInputMode(mode);
        setTplAmount(tplAmountFromMeal(m, tpl));
        setName('');
        setCalories('');
        setProtein('');
        setCarbohydrate('');
        setFat('');
        if (m.mealSlot) setMealSlot(m.mealSlot);
        if (m.snackPlacement) setSnackPlacement(m.snackPlacement);
        setLastOcrMeta(null);
        toast.show({ kind: 'info', message: '템플릿으로 불러왔어요.' });
        scheduleScrollToEntry();
        return;
      }
    }
    applyManualFromMeal(m);
  };

  const startEditMeal = (item: MealRow) => {
    setEditingMealId(item.mealId);
    setConsumedAt(item.consumedAt);
    if (item.mealSlot) setMealSlot(item.mealSlot);
    if (item.snackPlacement) setSnackPlacement(item.snackPlacement);
    else if (item.mealSlot === 'SNACK') setSnackPlacement(defaultSnackPlacementForNow());
    setLastOcrMeta(null);

    if (item.foodTemplateId) {
      const tpl = templates.find((x) => x.id === item.foodTemplateId);
      if (tpl) {
        setSelectedTpl(tpl);
        const mode = item.mealInputMode === 'TOTAL_GRAMS' ? 'TOTAL_GRAMS' : 'PORTION_COUNT';
        setMealInputMode(mode);
        setTplAmount(tplAmountFromMeal(item, tpl));
        setName('');
        setCalories('');
        setProtein('');
        setCarbohydrate('');
        setFat('');
        return;
      }
    }

    setSelectedTpl(null);
    setName(item.name);
    setCalories(String(Math.round(item.calories)));
    setProtein(String(Math.round(item.protein)));
    setCarbohydrate(String(Math.round(item.carbohydrate)));
    setFat(String(Math.round(item.fat)));
  };

  const selectTemplate = (item: FoodTemplateItem) => {
    setSelectedTpl(item);
    setMealInputMode('PORTION_COUNT');
    setTplAmount(defaultTplAmount(item, 'PORTION_COUNT'));
    setName('');
    setCalories('');
    setProtein('');
    setCarbohydrate('');
    setFat('');
    scheduleScrollToEntry();
  };

  const handleMealInputModeChange = (mode: TemplateInputMode) => {
    setMealInputMode(mode);
    if (selectedTpl) setTplAmount(defaultTplAmount(selectedTpl, mode));
  };

  const previewKcal =
    selectedTpl && Number.isFinite(Number(tplAmount))
      ? (() => {
          const amt = Number(String(tplAmount).replace(',', '.'));
          if (!Number.isFinite(amt) || amt <= 0 || !(selectedTpl.servingGrams > 0)) return null;
          const g = mealInputMode === 'PORTION_COUNT' ? amt * selectedTpl.servingGrams : amt;
          const scale = g / selectedTpl.servingGrams;
          return Math.round(selectedTpl.calories * scale);
        })()
      : null;

  const formHasPrefill = useMemo(() => {
    if (editingMealId || selectedTpl) return false;
    return (
      name.trim().length > 0 ||
      calories.trim().length > 0 ||
      protein.trim().length > 0 ||
      carbohydrate.trim().length > 0 ||
      fat.trim().length > 0
    );
  }, [editingMealId, selectedTpl, name, calories, protein, carbohydrate, fat]);

  const nameSuggestions = useMemo(() => {
    if (!nameFocused || selectedTpl) return [];
    const q = name.trim().toLowerCase();
    if (q.length < 1) return [];
    const pool = mealSuggestionPool(recentMeals, pastMeals, items);
    return pool.filter((m) => m.name.trim().toLowerCase().includes(q)).slice(0, NAME_SUGGEST_LIMIT);
  }, [nameFocused, selectedTpl, name, recentMeals, pastMeals, items]);

  const macroFields = (
    <View style={{ gap: t.spacing.sm }}>
      <View style={{ gap: t.spacing.xs, zIndex: 10 }}>
        <LabeledField
          label="음식명"
          value={name}
          onChangeText={setName}
          placeholder="예: 닭가슴살 샐러드"
          onFocus={() => {
            setNameFocused(true);
            focusEntryField();
          }}
          onBlur={() => {
            setTimeout(() => setNameFocused(false), 200);
          }}
        />
        {nameFocused && name.trim().length >= 1 && !selectedTpl ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: t.colors.border,
              borderRadius: t.radius.md,
              backgroundColor: t.colors.surface,
              overflow: 'hidden',
            }}
          >
            {nameSuggestions.length === 0 ? (
              <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, padding: t.spacing.md }}>
                {LOG_COPY.nameSuggestEmpty}
              </Text>
            ) : (
              nameSuggestions.map((m, idx) => (
                <Pressable
                  key={m.mealId}
                  onPress={() => {
                    applyRecentMeal(m);
                    setNameFocused(false);
                  }}
                  style={{
                    padding: t.spacing.md,
                    borderTopWidth: idx === 0 ? 0 : 1,
                    borderTopColor: t.colors.border,
                  }}
                >
                  <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
                    {m.name}
                  </Text>
                  <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                    {formatMacroLine({
                      protein: m.protein,
                      carbohydrate: m.carbohydrate,
                      fat: m.fat,
                    })}
                    {' · '}
                    {Math.round(m.calories)} kcal
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        ) : null}
      </View>
      <LabeledField
        label="칼로리 (kcal)"
        value={calories}
        onChangeText={setCalories}
        keyboardType="numeric"
        placeholder="0"
        onFocus={focusEntryField}
      />
      <LabeledField
        label="단백질 (g)"
        value={protein}
        onChangeText={setProtein}
        keyboardType="numeric"
        placeholder="0"
        onFocus={focusEntryField}
      />
      <LabeledField
        label="탄수화물 (g)"
        value={carbohydrate}
        onChangeText={setCarbohydrate}
        keyboardType="numeric"
        placeholder="0"
        onFocus={focusEntryField}
      />
      <LabeledField
        label="지방 (g)"
        value={fat}
        onChangeText={setFat}
        keyboardType="numeric"
        placeholder="0"
        onFocus={focusEntryField}
      />
    </View>
  );

  const templateChips = (
    <Card>
      <CardTitle>{LOG_COPY.sectionTemplates}</CardTitle>
      <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>{LOG_COPY.templatesHint}</Text>
      {tplLoading ? (
        <ActivityIndicator color={t.colors.primary} />
      ) : templates.length === 0 ? (
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>
          등록된 템플릿이 없거나 불러오지 못했습니다.
        </Text>
      ) : (
        <FlatList
          horizontal
          data={templates}
          keyExtractor={(it) => it.id}
          style={{ maxHeight: 44 }}
          contentContainerStyle={{ gap: t.spacing.sm }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => selectTemplate(item)}
              style={{
                paddingHorizontal: t.spacing.md,
                paddingVertical: t.spacing.sm,
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: selectedTpl?.id === item.id ? t.colors.primary : t.colors.border,
                backgroundColor: selectedTpl?.id === item.id ? t.colors.surface2 : t.colors.surface,
              }}
            >
              <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body }}>{item.name}</Text>
            </Pressable>
          )}
        />
      )}
    </Card>
  );

  return (
    <>
      <ScreenLayout
        title={LOG_COPY.title}
        subtitle={LOG_COPY.subtitle}
        onScroll={handleScroll}
        scrollRef={scrollRef}
        keyboardAvoiding
        contentPaddingBottomExtra={120}
      >
        {ent ? <Chip label={LOG_COPY.photoAnalysisChip(ent.ocrQuotaUsed, ent.ocrQuotaLimit)} /> : null}

        {ent?.nextPaywallTrigger === 'ocr_remaining_1' ? (
          <Banner variant="warn">{LOG_COPY.ocrBannerRemaining}</Banner>
        ) : null}
        {ent?.nextPaywallTrigger === 'ocr_exhausted' && !ent.ocrPaidEnabled ? (
          <Banner variant="warn">{LOG_COPY.ocrBannerExhausted}</Banner>
        ) : null}

        <Card>
          <CardTitle>{LOG_COPY.photoGuideTitle}</CardTitle>
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>{LOG_COPY.photoGuideBody}</Text>
          <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>{LOG_COPY.photoGuideAlbum}</Text>
        </Card>

        <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              title={LOG_COPY.ocrCamera}
              onPress={() => void pickImage('camera')}
              loading={ocrBusy}
            />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              title={LOG_COPY.ocrAlbum}
              onPress={() => void pickImage('library')}
              loading={ocrBusy}
              variant="secondary"
            />
          </View>
        </View>

        {templateChips}

        {recentMeals.length > 0 ? (
          <Card>
            <CardTitle>{LOG_COPY.sectionRecent}</CardTitle>
            <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>{LOG_COPY.recentHint}</Text>
            <FlatList
              horizontal
              data={recentMeals}
              keyExtractor={(it) => it.mealId}
              style={{ maxHeight: 72 }}
              contentContainerStyle={{ gap: t.spacing.sm }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => applyRecentMeal(item)}
                  style={{
                    paddingHorizontal: t.spacing.md,
                    paddingVertical: t.spacing.sm,
                    borderRadius: t.radius.md,
                    borderWidth: 1,
                    borderColor: t.colors.border,
                    backgroundColor: t.colors.surface,
                    maxWidth: 180,
                  }}
                >
                  <Text numberOfLines={1} style={{ color: t.colors.fg, fontWeight: '600', fontSize: t.fontSize.body }}>
                    {item.name}
                  </Text>
                  <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                    {Math.round(item.calories)} kcal
                  </Text>
                  <Text numberOfLines={1} style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>
                    {formatMacroLine(item)}
                  </Text>
                </Pressable>
              )}
            />
          </Card>
        ) : null}

        <View
          style={{ gap: t.spacing.md }}
          onLayout={(e) => {
            entrySectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <Card>
            <CardTitle>{LOG_COPY.sectionSlot}</CardTitle>
            {editingMealId ? (
              <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, marginBottom: t.spacing.sm }}>
                {LOG_COPY.slotEditHint}
              </Text>
            ) : null}
            <Segmented<MealSlot>
              options={MEAL_SLOT_OPTIONS}
              value={mealSlot}
              onChange={(next) => {
                setMealSlot(next);
                if (next === 'SNACK' && !snackPlacement) setSnackPlacement(defaultSnackPlacementForNow());
              }}
            />
            {mealSlot === 'SNACK' ? (
              <View style={{ marginTop: t.spacing.md, gap: t.spacing.sm }}>
                <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
                  {LOG_COPY.sectionSnackWhen}
                </Text>
                <RadioGroup
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
            {editingMealId ? (
              <Banner variant="info">{LOG_COPY.editBanner(name.trim() || selectedTpl?.name || '식사')}</Banner>
            ) : null}
            {lastOcrMeta && lastOcrMeta.confidence < 0.6 ? (
              <Banner variant="warn">{LOG_COPY.ocrLowConfidence}</Banner>
            ) : null}
            {!editingMealId && (selectedTpl || formHasPrefill) ? (
              <PrimaryButton
                title={LOG_COPY.switchToManual}
                onPress={switchToManualEntry}
                variant="secondary"
              />
            ) : null}

            {selectedTpl ? (
            <View style={{ gap: t.spacing.sm, marginBottom: t.spacing.sm }}>
              <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
                {selectedTpl.name}
              </Text>
              <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                기준 분량: {baselineSummary(selectedTpl)} (영양 기준 {selectedTpl.servingGrams}g) · 기준당 약{' '}
                {selectedTpl.calories} kcal
              </Text>
              <Segmented<TemplateInputMode>
                options={[
                  { value: 'PORTION_COUNT', label: '분량 수' },
                  { value: 'TOTAL_GRAMS', label: '총 g' },
                ]}
                value={mealInputMode}
                onChange={handleMealInputModeChange}
              />
              <LabeledField
                label={mealInputMode === 'PORTION_COUNT' ? `분량 (${unitHint(selectedTpl)})` : '총 중량 (g)'}
                value={tplAmount}
                onChangeText={setTplAmount}
                keyboardType="decimal-pad"
                placeholder={mealInputMode === 'PORTION_COUNT' ? `몇 ${unitHint(selectedTpl)}?` : '총 몇 g?'}
                onFocus={focusEntryField}
              />
              {previewKcal != null ? (
                <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                  예상 칼로리 약 {previewKcal} kcal
                </Text>
              ) : null}
            </View>
          ) : (
            macroFields
          )}

            <View style={{ gap: t.spacing.sm, marginTop: t.spacing.sm }}>
              <PrimaryButton
                title={editingMealId ? LOG_COPY.saveEdit : LOG_COPY.addMeal}
                onPress={() => void saveMeal()}
                loading={saveBusy}
              />
              {editingMealId ? (
                <>
                  <PrimaryButton
                    title={LOG_COPY.deleteMeal}
                    onPress={confirmDelete}
                    variant="secondary"
                    loading={saveBusy}
                  />
                  <TextButton title={LOG_COPY.cancelEdit} onPress={resetForm} />
                </>
              ) : null}
            </View>
          </Card>
        </View>

        {(() => {
          const timeline = groupMealsForTodayTimeline(items);
          const hasToday = timeline.some((s) => s.items.length > 0);
          return (
            <>
              <Card>
                <CardTitle>{LOG_COPY.todayTitle}</CardTitle>
                {!hasToday ? (
                  <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>{LOG_COPY.todayEmpty}</Text>
                ) : (
                  timeline.map((section) =>
                    section.items.length === 0 ? null : (
                      <View key={section.kind} style={{ marginBottom: t.spacing.md }}>
                        <Text
                          style={{
                            color: t.colors.fg,
                            fontSize: t.fontSize.body,
                            fontWeight: '700',
                            marginBottom: t.spacing.xs,
                          }}
                        >
                          {section.title} · {section.summaryKcal} kcal
                        </Text>
                        {section.items.map((item) => (
                          <Pressable
                            key={item.mealId}
                            onPress={() => startEditMeal(item)}
                            style={{
                              paddingVertical: t.spacing.sm,
                              borderBottomWidth: 1,
                              borderBottomColor: t.colors.border,
                            }}
                          >
                            <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
                              {mealRowSubtitle(item)}
                            </Text>
                            <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                              {item.calories} kcal · {formatMacroLine(item)}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    ),
                  )
                )}
              </Card>
              {pastMeals.length > 0 ? (
                <Card>
                  <CardTitle>{LOG_COPY.pastTitle}</CardTitle>
                  {pastMeals.map((item) => (
                    <Pressable
                      key={item.mealId}
                      onPress={() => startEditMeal(item)}
                      style={{
                        paddingVertical: t.spacing.sm,
                        borderBottomWidth: 1,
                        borderBottomColor: t.colors.border,
                      }}
                    >
                      <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
                        {mealRowSubtitle(item)}
                      </Text>
                      <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                        {item.calories} kcal · {formatMacroLine(item)} · {item.consumedAt.slice(0, 10)}
                      </Text>
                    </Pressable>
                  ))}
                  {pastLoadingMore ? (
                    <View style={{ paddingTop: t.spacing.sm, alignItems: 'center' }}>
                      <ActivityIndicator color={t.colors.primary} />
                      <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, marginTop: t.spacing.xs }}>
                        {LOG_COPY.pastLoadingMore}
                      </Text>
                    </View>
                  ) : null}
                </Card>
              ) : null}
            </>
          );
        })()}
      </ScreenLayout>

      <PaywallModal
        visible={paywallOpen}
        onSubscribe={() => void checkout()}
        onDismiss={() => setPaywallOpen(false)}
        busy={checkoutBusy}
      />
    </>
  );
}
