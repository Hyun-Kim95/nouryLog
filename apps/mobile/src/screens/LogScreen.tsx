import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type CompositeNavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import {
  ensureCameraPermissionForPicker,
  ensureLibraryPermissionForPicker,
  logImagePickerFailure,
} from '../lib/imagePickerErrors';
import { prepareOcrImageBase64 } from '../lib/prepareOcrImage';
import { apiFetch, ApiError, isAuthDenied } from '../api';
import {
  createMeal,
  deactivateMeal,
  listMeals,
  updateMeal,
  type FoodTemplateItem,
  type MealRow,
  type TemplateInputMode,
} from '../api/meals';
import type { NutritionFoodItem } from '../api/nutritionFoods';
import { postOcrFeedback } from '../api/ocrFeedback';
import { ensureAccessToken } from '../authSession';
import { getAccessToken } from '../authStorage';
import { LabeledField } from '../components/LabeledField';
import { canAdjustPortionInList, MealPortionStepper } from '../components/MealPortionStepper';
import { PortionQuantityModal } from '../components/PortionQuantityModal';
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
import { checkoutPremiumWithPlay } from '../billing/checkoutPremium';
import { isPlayBillingEnabled } from '../billing/feature';
import { BILLING_COPY } from '../copy/billing';
import { LOG_COPY } from '../copy/log';
import { MEAL_SET_COPY } from '../copy/mealSet';
import { useFocusReload } from '../hooks/useFocusReload';
import {
  nutritionFoodSearchStatusMessage,
  useNutritionFoodSearch,
} from '../hooks/useNutritionFoodSearch';
import { formatMacroLine } from '../lib/formatNutrition';
import { formatTplAmount as formatPortionAmount } from '../lib/mealEntryForm';
import {
  adjustMealGramsOnServer,
  adjustMealPortionCountOnServer,
  effectiveMealGrams,
} from '../lib/adjustMealGrams';
import { matchingGramPresets } from '../lib/gramPresets';
import {
  displayAmountFromGrams,
  findTemplateForIntakeUnit,
  gramsFromIntakeAmount,
  intakeUnitOptionsForName,
  macrosForIntakeAmount,
  mealNameMatchesQuery,
  priorMealAmountsForName,
  type IntakeUnitOption,
  type PriorMealAmount,
} from '../lib/priorMealAmounts';
import { resolvedEditableGrams } from '../lib/unsetManualGrams';
import {
  MEAL_PORTION_QTY_MAX,
  MEAL_PORTION_QTY_MIN,
  buildFoodTemplateMap,
  formatListMealQuantity,
  gramsToPortionQuantity,
  isLegacyPortionMeal,
  listMealQuantityDisplay,
} from '../lib/listMealQuantityDisplay';
import { parseManualNutrition } from '../lib/manualNutrition';
import { extractServingGramsFromOcrText } from '../lib/ocrServingGrams';
import {
  buildNutritionFoodMealBody,
  clampNutritionFoodGrams,
  formatScaledMacroForForm,
  NUTRITION_FOOD_GRAMS_MAX,
  NUTRITION_FOOD_GRAMS_MIN,
  NUTRITION_FOOD_NAME_MAX,
  nutritionFoodListEnergyHint,
  parseNutritionFoodGramsInput,
  resolveNutritionFoodDefaultGrams,
  scaleNutritionFromPer100g,
  type Per100gMacros,
} from '../lib/nutritionFoodScale';
import { logAppError, toUserMessage } from '../lib/userFacingError';
import { formatKstDayTitle, kstNoonIsoFromYmd, localDayBounds } from '../lib/dateRange';
import {
  mealEntrySuggestionsErrorMessage,
  useMealEntrySuggestions,
} from '../hooks/useMealEntrySuggestions';
import { groupMealsForTodayTimeline, mealRowSubtitle } from '../lib/mealTimeline';
import {
  defaultMealSlotForNow,
  defaultSnackPlacementForNow,
  MEAL_SLOT_OPTIONS,
  SNACK_PLACEMENT_OPTIONS,
  type MealSlot,
  type SnackPlacement,
} from '../lib/mealSlot';
import type { MainTabParamList, RootStackParamList } from '../navigation';

type LogRoute = RouteProp<MainTabParamList, 'Log'>;
type LogNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Log'>,
  NativeStackNavigationProp<RootStackParamList>
>;
import { useTheme } from '../theme';
import { AnalyticsEvents, track } from '../analytics';
import type { OcrSource, PaywallTriggerAnalytics } from '../analytics';
import { useToast } from '../toast/useToast';

type Ent = {
  ocrQuotaLimit: number;
  ocrQuotaUsed: number;
  ocrPaidEnabled: boolean;
  nextPaywallTrigger: 'none' | 'ocr_remaining_1' | 'ocr_exhausted';
};

type LastOcrMeta = {
  confidence: number;
  rawText?: string;
};

type OcrFieldSnapshot = {
  calories: string;
  protein: string;
  carbohydrate: string;
  fat: string;
};

function ocrFieldsEdited(snapshot: OcrFieldSnapshot, current: OcrFieldSnapshot): boolean {
  return (
    snapshot.calories !== current.calories ||
    snapshot.protein !== current.protein ||
    snapshot.carbohydrate !== current.carbohydrate ||
    snapshot.fat !== current.fat
  );
}

const MEAL_CREATE_TIMEOUT_MS = 45_000;

function isAmbiguousMealSaveError(e: unknown): boolean {
  if (!(e instanceof ApiError)) return false;
  return (
    e.code === 'TIMEOUT' ||
    e.code === 'NETWORK_UNAVAILABLE' ||
    e.status === 408 ||
    e.status === 0
  );
}

function openPaywall(
  setPaywallOpen: (open: boolean) => void,
  trigger: PaywallTriggerAnalytics,
): void {
  setPaywallOpen(true);
  track(AnalyticsEvents.paywallShown, { trigger });
}

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
  const navigation = useNavigation<LogNavigation>();
  const route = useRoute<LogRoute>();
  const targetYmd = route.params?.targetYmd;
  const [items, setItems] = useState<MealRow[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const entrySectionY = useRef(0);
  const nameFieldRef = useRef<View>(null);
  const caloriesFieldRef = useRef<View>(null);
  const proteinFieldRef = useRef<View>(null);
  const carbohydrateFieldRef = useRef<View>(null);
  const fatFieldRef = useRef<View>(null);
  const tplAmountFieldRef = useRef<View>(null);
  const [recentMeals, setRecentMeals] = useState<MealRow[]>([]);
  const [amountHistoryMeals, setAmountHistoryMeals] = useState<MealRow[]>([]);
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbohydrate, setCarbohydrate] = useState('');
  const [fat, setFat] = useState('');
  const [manualPortion, setManualPortion] = useState('1');
  const [mealSlot, setMealSlot] = useState<MealSlot>(() => defaultMealSlotForNow());
  const [snackPlacement, setSnackPlacement] = useState<SnackPlacement>(() => defaultSnackPlacementForNow());
  const [consumedAt, setConsumedAt] = useState(EMPTY_FORM.consumedAt);
  const [ent, setEnt] = useState<Ent | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const saveInFlightRef = useRef(false);
  const pendingCreateRequestIdRef = useRef<string | null>(null);
  const [lastOcrMeta, setLastOcrMeta] = useState<LastOcrMeta | null>(null);
  const [lastOcrSnapshot, setLastOcrSnapshot] = useState<OcrFieldSnapshot | null>(null);

  const [templates, setTemplates] = useState<FoodTemplateItem[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [selectedTpl, setSelectedTpl] = useState<FoodTemplateItem | null>(null);
  const [mealInputMode, setMealInputMode] = useState<TemplateInputMode>('PORTION_COUNT');
  const [tplAmount, setTplAmount] = useState('1');
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  /** Original name when edit started — used to detect “new food” vs rename/update. */
  const [editingOriginalName, setEditingOriginalName] = useState<string | null>(null);
  const [portionBusyMealId, setPortionBusyMealId] = useState<string | null>(null);
  const [portionInputMeal, setPortionInputMeal] = useState<MealRow | null>(null);
  const [portionInputValue, setPortionInputValue] = useState('');
  /** PORTION_COUNT 레거시 편집 시 템플릿 연동 유지(저장 후 g로 떨어지지 않게). */
  const [editingLegacyPortionId, setEditingLegacyPortionId] = useState<string | null>(null);
  const [nameFocused, setNameFocused] = useState(false);
  const [nutritionDraft, setNutritionDraft] = useState<{
    foodId: string;
    per100g: Per100gMacros;
  } | null>(null);
  const [nutritionGrams, setNutritionGrams] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [intakeUnitId, setIntakeUnitId] = useState('g');
  const [selectedPriorAmountId, setSelectedPriorAmountId] = useState<string | null>(null);
  const [nutritionMacrosLocked, setNutritionMacrosLocked] = useState(false);
  const gramsFieldRef = useRef<View>(null);

  const clearNutritionDraft = useCallback(() => {
    setNutritionDraft(null);
    setNutritionGrams('');
    setAmountInput('');
    setIntakeUnitId('g');
    setSelectedPriorAmountId(null);
    setNutritionMacrosLocked(false);
  }, []);

  const onLogScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  const scrollFieldIntoView = useCallback((fieldRef: RefObject<View | null>) => {
    const attemptScroll = () => {
      const field = fieldRef.current;
      const scroll = scrollRef.current;
      if (!field || !scroll) return;

      const windowH = Dimensions.get('window').height;
      const keyboardH = Keyboard.metrics()?.height ?? (Platform.OS === 'ios' ? 336 : 300);
      const keyboardTop = windowH - keyboardH;
      const padding = 24;

      field.measureInWindow((_x, y, _w, h) => {
        const fieldBottom = y + h;
        if (fieldBottom <= keyboardTop - padding) return;
        const delta = fieldBottom - keyboardTop + padding;
        scroll.scrollTo({
          y: scrollYRef.current + delta,
          animated: true,
        });
      });
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(attemptScroll);
    });
  }, []);

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

  /** 사용자 입력 시 제안 재활성(제안 탭 후 네이티브 포커스 유지 시 onFocus 미재호출 보완). */
  const handleNameChange = useCallback((text: string) => {
    setName(text);
    setNameFocused(true);
  }, []);

  const switchToManualEntry = useCallback(() => {
    setSelectedTpl(null);
    setMealInputMode('PORTION_COUNT');
    setTplAmount('1');
    setName('');
    setCalories('');
    setProtein('');
    setCarbohydrate('');
    setFat('');
    setManualPortion('1');
    setLastOcrMeta(null);
    setLastOcrSnapshot(null);
    clearNutritionDraft();
  }, [clearNutritionDraft]);

  const leaveEditForNewFood = useCallback(() => {
    if (!editingMealId) return;
    setEditingMealId(null);
    setEditingLegacyPortionId(null);
    setEditingOriginalName(null);
    toast.show({ kind: 'info', message: LOG_COPY.editSwitchedToNew });
  }, [editingMealId, toast]);

  const resetForm = useCallback(() => {
    setEditingMealId(null);
    setEditingLegacyPortionId(null);
    setEditingOriginalName(null);
    setName(EMPTY_FORM.name);
    setCalories(EMPTY_FORM.calories);
    setProtein(EMPTY_FORM.protein);
    setCarbohydrate(EMPTY_FORM.carbohydrate);
    setFat(EMPTY_FORM.fat);
    setManualPortion('1');
    setMealSlot(defaultMealSlotForNow());
    setSnackPlacement(defaultSnackPlacementForNow());
    setConsumedAt(new Date().toISOString());
    setSelectedTpl(null);
    setMealInputMode('PORTION_COUNT');
    setTplAmount('1');
    setLastOcrMeta(null);
    setLastOcrSnapshot(null);
    clearNutritionDraft();
    pendingCreateRequestIdRef.current = null;
  }, [clearNutritionDraft]);

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
      const [todayRes, recent, historyRes] = await Promise.all([
        listMeals(token, { page: 1, size: 100, from, to }),
        listMeals(token, { page: 1, size: 30, excludeFoodTemplate: true }),
        listMeals(token, { page: 1, size: 100 }),
      ]);
      setItems(todayRes.items ?? []);
      setAmountHistoryMeals(historyRes.items ?? []);
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
      setRecentMeals([]);
      setAmountHistoryMeals([]);
    }
  }, []);

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

  const tplById = useMemo(() => buildFoodTemplateMap(templates), [templates]);

  const newMealConsumedAt = (): string => {
    if (targetYmd) return kstNoonIsoFromYmd(targetYmd);
    return new Date().toISOString();
  };

  const mealBodyBase = (opts?: { keepConsumedAt?: boolean }): Record<string, unknown> => {
    const base: Record<string, unknown> = {
      mealSlot,
      consumedAt: opts?.keepConsumedAt ? consumedAt : newMealConsumedAt(),
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
    if (!editingMealId) {
      return {
        ...mealBodyBase(),
        foodTemplateId: selectedTpl.id,
        mealInputMode: 'PORTION_COUNT',
        portionQuantity: 1,
      };
    }
    const amt = Number(String(tplAmount).replace(',', '.'));
    if (!Number.isFinite(amt) || amt <= 0) throw new Error('수량을 올바르게 입력해 주세요.');
    const body: Record<string, unknown> = {
      ...mealBodyBase({ keepConsumedAt: true }),
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

  const saveMeal = async (opts?: { forceCreate?: boolean }) => {
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    setSaveBusy(true);
    const targetMealId = opts?.forceCreate ? null : editingMealId;
    const keepConsumedAt = Boolean(targetMealId);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('로그인 필요');
      if (mealSlot === 'SNACK' && !snackPlacement) {
        throw new Error(LOG_COPY.snackPlacementRequired);
      }

      const createMealOnce = async (body: Record<string, unknown>) => {
        if (!pendingCreateRequestIdRef.current) {
          pendingCreateRequestIdRef.current = Crypto.randomUUID();
        }
        const payload = { ...body, clientRequestId: pendingCreateRequestIdRef.current };
        try {
          return await createMeal(token, payload, { timeoutMs: MEAL_CREATE_TIMEOUT_MS });
        } catch (e) {
          if (isAmbiguousMealSaveError(e)) {
            return await createMeal(token, payload, { timeoutMs: MEAL_CREATE_TIMEOUT_MS });
          }
          throw e;
        }
      };

      // Phase 1 g-only: always name + grams + total macros (NF draft or pure manual).
      // Phase 1.1: editing a PORTION_COUNT template meal keeps template so list stays 개/접시.
      if (!name.trim()) throw new Error(LOG_COPY.nameRequired);
      if (name.trim().length > NUTRITION_FOOD_NAME_MAX) throw new Error(LOG_COPY.nutritionDbNameTooLong);
      let grams: number;
      try {
        if (!String(nutritionGrams).trim()) {
          throw new Error(LOG_COPY.gramsRequired);
        }
        grams = parseNutritionFoodGramsInput(nutritionGrams);
      } catch (e) {
        if (e instanceof Error && e.message === LOG_COPY.gramsRequired) throw e;
        throw new Error(LOG_COPY.nutritionDbGramsInvalid);
      }
      if (grams < NUTRITION_FOOD_GRAMS_MIN || grams > NUTRITION_FOOD_GRAMS_MAX) {
        throw new Error(LOG_COPY.nutritionDbGramsInvalid);
      }

      const portionTpl =
        intakeUnit.kind === 'portion'
          ? findTemplateForIntakeUnit(name, intakeUnit, templates) ??
            (editingLegacyPortionId && targetMealId
              ? tplById.get(editingLegacyPortionId) ?? null
              : null)
          : editingLegacyPortionId && targetMealId
            ? tplById.get(editingLegacyPortionId) ?? null
            : null;

      if (intakeUnit.kind === 'portion' && !portionTpl) {
        throw new Error(LOG_COPY.portionTemplateMissing);
      }

      if (portionTpl && (intakeUnit.kind === 'portion' || (editingLegacyPortionId && targetMealId))) {
        const portionQty =
          intakeUnit.kind === 'portion'
            ? Number(String(amountInput).replace(',', '.'))
            : gramsToPortionQuantity(grams, portionTpl.servingGrams);
        if (
          portionQty == null ||
          !Number.isFinite(portionQty) ||
          portionQty < MEAL_PORTION_QTY_MIN ||
          portionQty > MEAL_PORTION_QTY_MAX
        ) {
          throw new Error(LOG_COPY.portionQtyInvalid);
        }
        const tplBody: Record<string, unknown> = {
          ...mealBodyBase({ keepConsumedAt }),
          foodTemplateId: portionTpl.id,
          mealInputMode: 'PORTION_COUNT',
          portionQuantity: Math.round(portionQty * 100) / 100,
        };
        if (targetMealId) {
          await updateMeal(token, targetMealId, tplBody);
        } else {
          const created = await createMealOnce(tplBody);
          track(AnalyticsEvents.mealRecorded, {
            input_mode: 'manual',
            meal_slot: mealSlot.toLowerCase(),
            from_ocr: false,
          });
          void created;
        }
      } else {
        const nutrition = parseManualNutrition({ calories, protein, carbohydrate, fat });
        let body: Record<string, unknown>;
        try {
          body = buildNutritionFoodMealBody({
            mealBodyBase: mealBodyBase({ keepConsumedAt }),
            name,
            grams,
            ...nutrition,
            editing: Boolean(targetMealId),
          });
        } catch (e) {
          if (e instanceof Error && e.message === 'NAME_TOO_LONG') {
            throw new Error(LOG_COPY.nutritionDbNameTooLong);
          }
          if (e instanceof Error && e.message === 'INVALID_GRAMS') {
            throw new Error(LOG_COPY.nutritionDbGramsInvalid);
          }
          throw e;
        }
        if (targetMealId) {
          await updateMeal(token, targetMealId, body);
        } else {
          const created = await createMealOnce(body);
          const fromOcr = lastOcrSnapshot != null;
          const currentFields: OcrFieldSnapshot = { calories, protein, carbohydrate, fat };
          const editedBeforeSave = fromOcr && ocrFieldsEdited(lastOcrSnapshot, currentFields);
          if (fromOcr) {
            track(AnalyticsEvents.ocrCompleted, { edited_before_save: editedBeforeSave });
          }
          if (fromOcr && editedBeforeSave && lastOcrSnapshot) {
            const rawOcr = {
              calories: Math.round(Number(lastOcrSnapshot.calories)),
              protein: Math.round(Number(lastOcrSnapshot.protein)),
              carbohydrate: Math.round(Number(lastOcrSnapshot.carbohydrate)),
              fat: Math.round(Number(lastOcrSnapshot.fat)),
              rawText: lastOcrMeta?.rawText,
            };
            const corrected = {
              calories: Math.round(Number(calories)),
              protein: Math.round(Number(protein)),
              carbohydrate: Math.round(Number(carbohydrate)),
              fat: Math.round(Number(fat)),
            };
            void postOcrFeedback(token, {
              rawOcr,
              corrected,
              mealId: created.mealId,
              confidence: lastOcrMeta?.confidence,
            }).catch(() => undefined);
          }
          track(AnalyticsEvents.mealRecorded, {
            input_mode: fromOcr ? 'ocr' : 'manual',
            meal_slot: mealSlot.toLowerCase(),
            from_ocr: fromOcr,
          });
          setLastOcrSnapshot(null);
          setLastOcrMeta(null);
        }
      }

      pendingCreateRequestIdRef.current = null;
      toast.show({
        kind: 'success',
        message: targetMealId ? LOG_COPY.editSuccess : LOG_COPY.saveSuccess,
      });
      resetForm();
      await load();
    } catch (e) {
      if (isAuthDenied(e)) return;
      logAppError('[LogScreen] save', e);
      toast.show({
        kind: 'error',
        message: toUserMessage(e, { context: 'meal', fallback: '저장에 실패했어요.' }),
      });
    } finally {
      saveInFlightRef.current = false;
      setSaveBusy(false);
    }
  };

  const requestSaveMeal = () => {
    if (saveInFlightRef.current || saveBusy) return;
    if (
      editingMealId &&
      editingOriginalName != null &&
      !mealNameMatchesQuery(name, editingOriginalName)
    ) {
      Alert.alert(LOG_COPY.editNameChangedTitle, LOG_COPY.editNameChangedBody, [
        { text: '취소', style: 'cancel' },
        {
          text: LOG_COPY.editNameChangedUpdate,
          onPress: () => void saveMeal({ forceCreate: false }),
        },
        {
          text: LOG_COPY.editNameChangedCreate,
          onPress: () => void saveMeal({ forceCreate: true }),
        },
      ]);
      return;
    }
    void saveMeal();
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
      logAppError('[LogScreen] delete', e);
      toast.show({
        kind: 'error',
        message: toUserMessage(e, { context: 'meal', fallback: '삭제에 실패했어요.' }),
      });
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
      servingGrams?: number | null;
      confidence: number;
      missingFields: string[];
      remainingFreeQuota: number;
      rawText?: string;
    }>('/nutrition/ocr', {
      method: 'POST',
      token,
      body: JSON.stringify({ imageBase64 }),
    });
    setLastOcrMeta({ confidence: res.confidence, rawText: res.rawText });
    setLastOcrSnapshot({
      calories: String(Math.round(res.calories)),
      protein: String(Math.round(res.protein)),
      carbohydrate: String(Math.round(res.carbohydrate)),
      fat: String(Math.round(res.fat)),
    });
    setSelectedTpl(null);
    setEditingMealId(null);
    setEditingLegacyPortionId(null);
    setEditingOriginalName(null);
    clearNutritionDraft();
    // OCR 매크로는 총량. API servingGrams 또는 rawText 파싱으로 섭취량 채움.
    setCalories(String(Math.round(res.calories)));
    setProtein(String(Math.round(res.protein)));
    setCarbohydrate(String(Math.round(res.carbohydrate)));
    setFat(String(Math.round(res.fat)));
    const fromApi =
      typeof res.servingGrams === 'number' &&
      Number.isFinite(res.servingGrams) &&
      res.servingGrams >= NUTRITION_FOOD_GRAMS_MIN &&
      res.servingGrams <= NUTRITION_FOOD_GRAMS_MAX
        ? res.servingGrams
        : null;
    const serving = fromApi ?? extractServingGramsFromOcrText(res.rawText);
    if (serving != null) {
      const gText = formatScaledMacroForForm(serving);
      setNutritionGrams(gText);
      setAmountInput(gText);
      setIntakeUnitId('g');
    }
    await loadEntitlements();
    toast.show({
      kind: 'info',
      message: LOG_COPY.ocrDoneToast(res.remainingFreeQuota),
    });
    if (serving == null) {
      toast.show({
        kind: 'info',
        message: LOG_COPY.ocrServingGramsMissing,
      });
    }
    scheduleScrollToEntry();
  };

  const pickImage = async (source: OcrSource) => {
    if (ent?.nextPaywallTrigger === 'ocr_exhausted' && !ent.ocrPaidEnabled) {
      openPaywall(setPaywallOpen, 'ocr_exhausted');
      return;
    }
    setOcrBusy(true);
    track(AnalyticsEvents.ocrStarted, { source });
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('로그인 필요');

      const mediaTypes = ImagePicker.MediaTypeOptions.Images;
      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes,
        quality: 0.8,
      };

      if (source === 'camera') {
        await ensureCameraPermissionForPicker();
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
        const base64 = await prepareOcrImageBase64(asset);
        if (!base64) throw new Error(LOG_COPY.ocrImageLoadFailed);
        await runOcrWithBase64(base64);
      } else {
        await ensureLibraryPermissionForPicker();
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
        const base64 = await prepareOcrImageBase64(asset);
        if (!base64) throw new Error(LOG_COPY.ocrImageLoadFailed);
        await runOcrWithBase64(base64);
      }
    } catch (e) {
      if (isAuthDenied(e)) return;
      logImagePickerFailure(source, e);
      const msg = toUserMessage(e, {
        context: 'ocr',
        fallback: source === 'camera' ? LOG_COPY.ocrCameraFailed : LOG_COPY.ocrAlbumFailed,
      });
      if (
        e instanceof ApiError &&
        (e.code === 'OCR_FREE_QUOTA_EXCEEDED' || e.code === 'PAYMENT_REQUIRED')
      ) {
        openPaywall(setPaywallOpen, 'ocr_quota_exceeded');
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
      await checkoutPremiumWithPlay(token);
      toast.show({ kind: 'success', message: BILLING_COPY.subscribeSuccess });
      setPaywallOpen(false);
      await loadEntitlements();
    } catch (e) {
      if (isAuthDenied(e)) return;
      logAppError('[LogScreen] checkout', e);
      const msg = toUserMessage(e, { context: 'billing', fallback: BILLING_COPY.actionError });
      const kind = msg === '결제가 취소되었습니다.' ? 'info' : 'error';
      toast.show({ kind, message: msg });
    } finally {
      setCheckoutBusy(false);
    }
  };

  const applyManualFromMeal = (m: MealRow) => {
    leaveEditForNewFood();
    setSelectedTpl(null);
    setLastOcrMeta(null);
    clearNutritionDraft();
    setName(m.name);
    const g = resolvedEditableGrams(m);
    if (g != null) {
      setNutritionGrams(formatScaledMacroForForm(g));
      const disp = listMealQuantityDisplay(m, tplById);
      if (disp?.stepMode === 'portion') {
        const unitId = `p:${disp.unitLabel}:${disp.servingGrams}`;
        setIntakeUnitId(unitId);
        setAmountInput(formatListMealQuantity(disp.quantity));
      } else {
        setIntakeUnitId('g');
        setAmountInput(formatScaledMacroForForm(g));
      }
    } else {
      setNutritionGrams('');
      setAmountInput('');
      setIntakeUnitId('g');
    }
    setSelectedPriorAmountId(null);
    setManualPortion('1');
    setCalories(formatScaledMacroForForm(m.calories));
    setProtein(formatScaledMacroForForm(m.protein));
    setCarbohydrate(formatScaledMacroForForm(m.carbohydrate));
    setFat(formatScaledMacroForForm(m.fat));
    if (m.mealSlot) setMealSlot(m.mealSlot);
    if (m.snackPlacement) setSnackPlacement(m.snackPlacement);
    toast.show({ kind: 'info', message: '입력란에 불러왔어요. 확인 후 저장해 주세요.' });
    scheduleScrollToEntry();
  };

  const adjustMealPortion = async (item: MealRow, nextQty: number) => {
    setPortionBusyMealId(item.mealId);
    try {
      const token = await ensureAccessToken();
      if (!token) throw new Error('로그인 필요');
      const tplId = item.foodTemplateId?.trim() || null;
      const tpl = tplId ? tplById.get(tplId) : undefined;
      // Never convert legacy 개/접시 meals to g via grams ±10 (clears foodTemplateId).
      if (isLegacyPortionMeal(item)) {
        if (!tpl || !(tpl.servingGrams > 0)) {
          toast.show({ kind: 'error', message: LOG_COPY.portionTemplateLoadFailed });
          await loadTemplates();
          return;
        }
        const disp = listMealQuantityDisplay(item, tplById);
        let nextPortion = nextQty;
        if (disp?.stepMode !== 'portion') {
          const converted = gramsToPortionQuantity(nextQty, tpl.servingGrams);
          if (converted == null) {
            toast.show({ kind: 'error', message: LOG_COPY.portionQtyInvalid });
            return;
          }
          nextPortion = converted;
        }
        await adjustMealPortionCountOnServer(token, item, nextPortion);
      } else {
        if (!(effectiveMealGrams(item.grams) > 0)) {
          toast.show({ kind: 'error', message: LOG_COPY.gramsMissingAdjust });
          return;
        }
        await adjustMealGramsOnServer(token, item, nextQty);
      }
      await load();
    } catch (e) {
      if (isAuthDenied(e)) return;
      logAppError('[LogScreen] portion', e);
      toast.show({
        kind: 'error',
        message: toUserMessage(e, { context: 'meal', fallback: LOG_COPY.portionAdjustError }),
      });
      await load();
    } finally {
      setPortionBusyMealId(null);
    }
  };

  const openPortionInput = (item: MealRow) => {
    const disp = listMealQuantityDisplay(item, tplById);
    if (!disp) {
      toast.show({ kind: 'error', message: LOG_COPY.gramsMissingAdjust });
      return;
    }
    setPortionInputMeal(item);
    setPortionInputValue(formatListMealQuantity(disp.quantity));
  };

  const closePortionInput = () => {
    if (portionBusyMealId) return;
    setPortionInputMeal(null);
    setPortionInputValue('');
  };

  const submitPortionInput = async () => {
    if (!portionInputMeal) return;
    const disp = listMealQuantityDisplay(portionInputMeal, tplById);
    if (!disp) {
      toast.show({ kind: 'error', message: LOG_COPY.gramsMissingAdjust });
      return;
    }
    const nextQty = Number(String(portionInputValue).replace(',', '.'));
    if (disp.stepMode === 'portion') {
      if (
        !Number.isFinite(nextQty) ||
        nextQty < MEAL_PORTION_QTY_MIN ||
        nextQty > MEAL_PORTION_QTY_MAX
      ) {
        toast.show({ kind: 'error', message: LOG_COPY.portionQtyInvalid });
        return;
      }
      await adjustMealPortion(portionInputMeal, Math.round(nextQty * 100) / 100);
    } else {
      if (
        !Number.isFinite(nextQty) ||
        nextQty < NUTRITION_FOOD_GRAMS_MIN ||
        nextQty > NUTRITION_FOOD_GRAMS_MAX
      ) {
        toast.show({ kind: 'error', message: LOG_COPY.gramsInvalid });
        return;
      }
      await adjustMealPortion(portionInputMeal, Math.round(nextQty * 10) / 10);
    }
    setPortionInputMeal(null);
    setPortionInputValue('');
  };

  const applyRecentMeal = (m: MealRow) => {
    applyManualFromMeal(m);
  };

  const startEditMeal = (item: MealRow) => {
    setEditingMealId(item.mealId);
    setEditingOriginalName(item.name);
    setConsumedAt(item.consumedAt);
    if (item.mealSlot) setMealSlot(item.mealSlot);
    if (item.snackPlacement) setSnackPlacement(item.snackPlacement);
    else if (item.mealSlot === 'SNACK') setSnackPlacement(defaultSnackPlacementForNow());
    setLastOcrMeta(null);
    clearNutritionDraft();
    setSelectedTpl(null);
    setName(item.name);
    const g = resolvedEditableGrams(item);
    if (g != null) {
      setNutritionGrams(formatScaledMacroForForm(g));
      const disp = listMealQuantityDisplay(item, tplById);
      if (disp?.stepMode === 'portion') {
        setIntakeUnitId(`p:${disp.unitLabel}:${disp.servingGrams}`);
        setAmountInput(formatListMealQuantity(disp.quantity));
      } else {
        setIntakeUnitId('g');
        setAmountInput(formatScaledMacroForForm(g));
      }
    } else {
      setNutritionGrams('');
      setAmountInput('');
      setIntakeUnitId('g');
    }
    setSelectedPriorAmountId(null);
    setManualPortion('1');
    setCalories(formatScaledMacroForForm(item.calories));
    setProtein(formatScaledMacroForForm(item.protein));
    setCarbohydrate(formatScaledMacroForForm(item.carbohydrate));
    setFat(formatScaledMacroForForm(item.fat));
    const legacyTplId =
      isLegacyPortionMeal(item) && item.foodTemplateId?.trim()
        ? item.foodTemplateId.trim()
        : null;
    setEditingLegacyPortionId(legacyTplId);
    scheduleScrollToEntry();
  };

  const selectTemplate = (item: FoodTemplateItem) => {
    leaveEditForNewFood();
    setSelectedTpl(null);
    setLastOcrMeta(null);
    setLastOcrSnapshot(null);
    clearNutritionDraft();
    setName(item.name);
    if (item.servingGrams > 0) {
      const grams = clampNutritionFoodGrams(item.servingGrams);
      setNutritionGrams(formatScaledMacroForForm(grams));
      if (item.portionUnit !== 'GRAM') {
        const unitLabel =
          item.portionLabel ||
          (item.portionUnit === 'PIECE'
            ? '개'
            : item.portionUnit === 'PLATE'
              ? '접시'
              : item.portionUnit === 'BOWL'
                ? '공기'
                : '단위');
        setIntakeUnitId(`p:${unitLabel}:${item.servingGrams}`);
        setAmountInput('1');
      } else {
        setIntakeUnitId('g');
        setAmountInput(formatScaledMacroForForm(grams));
      }
    } else {
      setNutritionGrams('');
      setAmountInput('');
      setIntakeUnitId('g');
    }
    setCalories(formatScaledMacroForForm(item.calories));
    setProtein(formatScaledMacroForForm(item.protein));
    setCarbohydrate(formatScaledMacroForForm(item.carbohydrate));
    setFat(formatScaledMacroForForm(item.fat));
    setNutritionMacrosLocked(false);
    scheduleScrollToEntry();
  };

  const selectNutritionFood = (item: NutritionFoodItem) => {
    leaveEditForNewFood();
    setSelectedTpl(null);
    setLastOcrMeta(null);
    setLastOcrSnapshot(null);
    setNutritionMacrosLocked(false);
    setNutritionDraft({ foodId: item.id, per100g: { ...item.per100g } });
    setName(item.name);
    const hasDefault =
      item.defaultServingGrams != null &&
      Number.isFinite(item.defaultServingGrams) &&
      item.defaultServingGrams > 0;
    if (!hasDefault) {
      setNutritionGrams('');
      setAmountInput('');
      setIntakeUnitId('g');
      setCalories('');
      setProtein('');
      setCarbohydrate('');
      setFat('');
      setNameFocused(false);
      scheduleScrollToEntry();
      return;
    }
    const grams = resolveNutritionFoodDefaultGrams(item.defaultServingGrams);
    setIntakeUnitId('g');
    setAmountInput(formatScaledMacroForForm(grams));
    setNutritionGrams(formatScaledMacroForForm(grams));
    try {
      const scaled = scaleNutritionFromPer100g(item.per100g, grams);
      setCalories(formatScaledMacroForForm(scaled.calories));
      setProtein(formatScaledMacroForForm(scaled.protein));
      setCarbohydrate(formatScaledMacroForForm(scaled.carbohydrate));
      setFat(formatScaledMacroForForm(scaled.fat));
    } catch {
      toast.show({ kind: 'error', message: LOG_COPY.nutritionDbScaleInvalid });
      clearNutritionDraft();
      return;
    }
    setNameFocused(false);
    scheduleScrollToEntry();
  };

  const applyMacros = (macros: { calories: number; protein: number; carbohydrate: number; fat: number }) => {
    setCalories(formatScaledMacroForForm(macros.calories));
    setProtein(formatScaledMacroForForm(macros.protein));
    setCarbohydrate(formatScaledMacroForForm(macros.carbohydrate));
    setFat(formatScaledMacroForForm(macros.fat));
  };

  const syncGramsFromAmount = (unit: IntakeUnitOption, text: string) => {
    const grams = gramsFromIntakeAmount(unit, text);
    if (grams == null) {
      setNutritionGrams('');
      return null;
    }
    setNutritionGrams(formatScaledMacroForForm(grams));
    return grams;
  };

  const onAmountInputChange = (text: string) => {
    setAmountInput(text);
    setSelectedPriorAmountId(null);
    const grams = syncGramsFromAmount(intakeUnit, text);
    if (grams == null) return;

    if (intakeUnit.kind === 'portion') {
      const portionMacros = macrosForIntakeAmount(intakeUnit, text);
      if (portionMacros && !nutritionMacrosLocked) {
        applyMacros(portionMacros);
        return;
      }
    }
    if (!nutritionDraft || nutritionMacrosLocked) return;
    try {
      if (grams < NUTRITION_FOOD_GRAMS_MIN || grams > NUTRITION_FOOD_GRAMS_MAX) return;
      const scaled = scaleNutritionFromPer100g(nutritionDraft.per100g, grams);
      applyMacros(scaled);
    } catch {
      /* typing incomplete */
    }
  };

  const onIntakeUnitChange = (unitId: string) => {
    setIntakeUnitId(unitId);
    setSelectedPriorAmountId(null);
    const unit = intakeUnits.find((u) => u.id === unitId) ?? intakeUnits[0]!;
    if (unit.kind === 'portion') {
      const tpl = findTemplateForIntakeUnit(name, unit, templates);
      setEditingLegacyPortionId(tpl?.id ?? editingLegacyPortionId);
    } else if (!editingMealId) {
      setEditingLegacyPortionId(null);
    }
    let grams = 0;
    try {
      grams = parseNutritionFoodGramsInput(nutritionGrams);
    } catch {
      grams = 0;
    }
    if (grams > 0) {
      setAmountInput(displayAmountFromGrams(unit, grams));
      if (unit.kind === 'portion' && !nutritionMacrosLocked) {
        const qtyText = displayAmountFromGrams(unit, grams);
        const portionMacros = macrosForIntakeAmount(unit, qtyText);
        if (portionMacros) applyMacros(portionMacros);
      }
    } else {
      setAmountInput('');
    }
  };

  const applyPriorAmount = (amt: PriorMealAmount) => {
    setNutritionDraft(null);
    setNutritionMacrosLocked(false);
    setIntakeUnitId(amt.unitId);
    setAmountInput(formatListMealQuantity(amt.unitQuantity));
    setNutritionGrams(formatScaledMacroForForm(amt.grams));
    applyMacros(amt.macros);
    setSelectedPriorAmountId(amt.id);
    const unit =
      intakeUnits.find((u) => u.id === amt.unitId) ??
      ({
        id: amt.unitId,
        label: amt.unitLabel,
        kind: amt.unitId === 'g' ? 'grams' : 'portion',
        servingGrams: amt.unitId === 'g' ? null : amt.grams / Math.max(amt.unitQuantity, 1e-9),
        perUnitMacros: null,
      } satisfies IntakeUnitOption);
    if (unit.kind === 'portion') {
      const tpl = findTemplateForIntakeUnit(name, unit, templates);
      setEditingLegacyPortionId(tpl?.id ?? null);
    } else {
      setEditingLegacyPortionId(null);
    }
  };

  const onNutritionGramsChange = (text: string) => {
    // Legacy helper: treat as grams-unit amount entry.
    setIntakeUnitId('g');
    setAmountInput(text);
    setNutritionGrams(text);
    if (!nutritionDraft || nutritionMacrosLocked) return;
    try {
      const grams = parseNutritionFoodGramsInput(text);
      if (grams < NUTRITION_FOOD_GRAMS_MIN || grams > NUTRITION_FOOD_GRAMS_MAX) return;
      const scaled = scaleNutritionFromPer100g(nutritionDraft.per100g, grams);
      applyMacros(scaled);
    } catch {
      /* typing incomplete */
    }
  };

  const lockNutritionMacrosOnEdit = (setter: (v: string) => void) => (text: string) => {
    setter(text);
    if (nutritionDraft) setNutritionMacrosLocked(true);
  };

  const handleMealInputModeChange = (mode: TemplateInputMode) => {
    setMealInputMode(mode);
    if (selectedTpl) setTplAmount(defaultTplAmount(selectedTpl, mode));
  };

  const previewKcal =
    editingMealId && selectedTpl && mealInputMode === 'TOTAL_GRAMS' && Number.isFinite(Number(tplAmount))
      ? (() => {
          const amt = Number(String(tplAmount).replace(',', '.'));
          if (!Number.isFinite(amt) || amt <= 0 || !(selectedTpl.servingGrams > 0)) return null;
          const scale = amt / selectedTpl.servingGrams;
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

  const gramPresets = useMemo(() => matchingGramPresets(name), [name]);
  const priorAmounts = useMemo(
    () => priorMealAmountsForName(name, amountHistoryMeals, tplById, 5),
    [name, amountHistoryMeals, tplById],
  );
  const intakeUnits = useMemo(
    () => intakeUnitOptionsForName(name, amountHistoryMeals, templates),
    [name, amountHistoryMeals, templates],
  );
  const intakeUnit: IntakeUnitOption = useMemo(() => {
    return intakeUnits.find((u) => u.id === intakeUnitId) ?? intakeUnits[0]!;
  }, [intakeUnits, intakeUnitId]);
  const gramPresetsExtra = useMemo(() => {
    if (priorAmounts.length === 0) return gramPresets;
    return gramPresets.filter(
      (p) => !priorAmounts.some((a) => Math.abs(a.grams - p.grams) < 0.05),
    );
  }, [gramPresets, priorAmounts]);

  // Drop stale portion unit when food name no longer supports it.
  useEffect(() => {
    if (intakeUnits.some((u) => u.id === intakeUnitId)) return;
    setIntakeUnitId('g');
    setSelectedPriorAmountId(null);
    if (!editingMealId) setEditingLegacyPortionId(null);
    let grams = 0;
    try {
      grams = parseNutritionFoodGramsInput(nutritionGrams);
    } catch {
      grams = 0;
    }
    // Keep amountInput aligned with nutritionGrams (avoid showing "2" while saving 100g).
    setAmountInput(grams > 0 ? formatScaledMacroForForm(grams) : '');
  }, [intakeUnits, intakeUnitId, nutritionGrams, editingMealId]);

  const nameSuggestEnabled = nameFocused && name.trim().length >= 1;
  const { items: nameSuggestions, status: nameSuggestStatus, errorKind: nameSuggestErrorKind } =
    useMealEntrySuggestions(name, nameSuggestEnabled, { sources: 'past_meal' });
  const {
    items: nutritionFoodItems,
    status: nutritionFoodStatus,
    retry: retryNutritionFoodSearch,
  } = useNutritionFoodSearch(name, nameSuggestEnabled);
  const fallbackNameSuggestions = useMemo(() => {
    const needle = name.trim().toLowerCase();
    if (!needle) return [] as Array<{ kind: 'past_meal'; meal: MealRow }>;
    const picked: Array<{ kind: 'past_meal'; meal: MealRow }> = [];
    const seen = new Set<string>();
    // recentMeals는 excludeFoodTemplate+소수라 좁음 → 이력(최대 100)을 먼저 본다.
    for (const meal of [...amountHistoryMeals, ...recentMeals]) {
      const n = meal.name.trim();
      if (!n.toLowerCase().includes(needle)) continue;
      const key = n.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push({ kind: 'past_meal', meal });
      if (picked.length >= 8) return picked;
    }
    return picked;
  }, [name, amountHistoryMeals, recentMeals]);
  const displayNameSuggestions = useMemo(() => {
    const pastFromApi = nameSuggestions.filter(
      (s): s is Extract<(typeof nameSuggestions)[number], { kind: 'past_meal' }> =>
        s.kind === 'past_meal',
    );
    // API가 템플릿만 주거나 구서버면 past가 비므로, 로컬 이력 폴백을 병합(이름 중복 제거).
    if (pastFromApi.length === 0) return fallbackNameSuggestions;
    const seen = new Set(pastFromApi.map((s) => s.meal.name.trim().toLowerCase()));
    const merged = [...pastFromApi];
    for (const fb of fallbackNameSuggestions) {
      const key = fb.meal.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(fb);
      if (merged.length >= 8) break;
    }
    return merged;
  }, [nameSuggestions, fallbackNameSuggestions]);

  const macroFields = (
    <View style={{ gap: t.spacing.sm }}>
      <View style={{ gap: t.spacing.xs, zIndex: 10 }}>
        <View ref={nameFieldRef} collapsable={false}>
          <LabeledField
            label="음식명"
            value={name}
            onChangeText={handleNameChange}
            placeholder="예: 닭가슴살 샐러드"
            onFocus={() => {
              setNameFocused(true);
              scrollFieldIntoView(nameFieldRef);
            }}
            onBlur={() => {
              setTimeout(() => setNameFocused(false), 200);
            }}
          />
        </View>
        {nameSuggestEnabled ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: t.colors.border,
              borderRadius: t.radius.md,
              backgroundColor: t.colors.surface,
              overflow: 'hidden',
            }}
          >
            {nameSuggestStatus === 'loading' ? (
              <View style={{ padding: t.spacing.md, flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                <ActivityIndicator color={t.colors.primary} size="small" />
                <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                  {LOG_COPY.nameSuggestLoading}
                </Text>
              </View>
            ) : nameSuggestStatus === 'error' ? (
              <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, padding: t.spacing.md }}>
                {mealEntrySuggestionsErrorMessage(nameSuggestErrorKind)}
              </Text>
            ) : displayNameSuggestions.length === 0 ? (
              <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, padding: t.spacing.md }}>
                {LOG_COPY.nameSuggestEmpty}
              </Text>
            ) : (
              displayNameSuggestions.map((s, idx) => (
                <Pressable
                  key={s.meal.mealId}
                  onPress={() => {
                    applyRecentMeal(s.meal);
                    setNameFocused(false);
                  }}
                  style={{
                    padding: t.spacing.md,
                    borderTopWidth: idx === 0 ? 0 : 1,
                    borderTopColor: t.colors.border,
                  }}
                >
                  <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
                    {s.meal.name}
                  </Text>
                  <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                    {formatMacroLine({
                      protein: s.meal.protein,
                      carbohydrate: s.meal.carbohydrate,
                      fat: s.meal.fat,
                    })}
                    {' · '}
                    {Math.round(s.meal.calories)} kcal
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        ) : null}
        {nameSuggestEnabled ? (
          <View
            style={{
              marginTop: t.spacing.sm,
              borderWidth: 1,
              borderColor: t.colors.border,
              borderRadius: t.radius.md,
              backgroundColor: t.colors.surface,
              overflow: 'hidden',
            }}
          >
            <View style={{ paddingHorizontal: t.spacing.md, paddingTop: t.spacing.md, gap: 2 }}>
              <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, fontWeight: '600' }}>
                {LOG_COPY.nutritionDbSectionTitle}
              </Text>
              <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                {LOG_COPY.nutritionDbSectionHint}
              </Text>
            </View>
            {nutritionFoodStatus === 'loading' ? (
              <View style={{ padding: t.spacing.md, flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                <ActivityIndicator color={t.colors.primary} size="small" />
                <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                  {LOG_COPY.nameSuggestLoading}
                </Text>
              </View>
            ) : nutritionFoodStatus === 'error' || nutritionFoodStatus === 'q_too_long' ? (
              <View style={{ padding: t.spacing.md, gap: t.spacing.xs }}>
                <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                  {nutritionFoodSearchStatusMessage(nutritionFoodStatus)}
                </Text>
                {nutritionFoodStatus === 'error' ? (
                  <TextButton title={LOG_COPY.nutritionDbRetry} onPress={() => retryNutritionFoodSearch()} />
                ) : null}
              </View>
            ) : nutritionFoodItems.length === 0 ? (
              <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, padding: t.spacing.md }}>
                {LOG_COPY.nutritionDbEmpty}
              </Text>
            ) : (
              nutritionFoodItems.map((item, idx) => (
                <Pressable
                  key={item.id}
                  onPress={() => selectNutritionFood(item)}
                  style={{
                    padding: t.spacing.md,
                    borderTopWidth: idx === 0 ? 0 : 1,
                    borderTopColor: t.colors.border,
                  }}
                >
                  <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
                    {item.name}
                  </Text>
                  <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                    {item.category ? `${item.category} · ` : ''}
                    {nutritionFoodListEnergyHint(item)}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        ) : null}
      </View>
      <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
        {LOG_COPY.manualPerServingHint}
      </Text>
      {intakeUnits.length > 1 ? (
        <Segmented<string>
          label={LOG_COPY.intakeUnitLabel}
          options={intakeUnits.map((u) => ({ value: u.id, label: u.label }))}
          value={intakeUnit.id}
          onChange={onIntakeUnitChange}
        />
      ) : null}
      <View ref={gramsFieldRef} collapsable={false}>
        <LabeledField
          label={`${LOG_COPY.gramsInputLabel} (${intakeUnit.label})`}
          value={amountInput}
          onChangeText={onAmountInputChange}
          keyboardType="numeric"
          placeholder={
            intakeUnit.kind === 'grams' ? LOG_COPY.gramsPlaceholder : LOG_COPY.portionAmountPlaceholder
          }
          onFocus={() => scrollFieldIntoView(gramsFieldRef)}
        />
      </View>
      {priorAmounts.length > 0 ? (
        <View style={{ gap: t.spacing.xs }}>
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
            {LOG_COPY.priorAmountHint}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
            {priorAmounts.map((amt) => {
              const selected = selectedPriorAmountId === amt.id;
              return (
              <Pressable
                key={amt.id}
                onPress={() => applyPriorAmount(amt)}
                style={({ pressed }) => ({
                  paddingVertical: t.spacing.sm,
                  paddingHorizontal: t.spacing.md,
                  borderRadius: t.radius.md,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? t.colors.primary : t.colors.border,
                  backgroundColor: selected
                    ? t.colors.surface2
                    : pressed
                      ? t.colors.surface2
                      : t.colors.surface,
                })}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${LOG_COPY.priorAmountHint} ${amt.label}${selected ? ` ${LOG_COPY.priorAmountSelected}` : ''}`}
              >
                <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '700' }}>
                  {amt.label}
                  {selected ? ` · ${LOG_COPY.priorAmountSelected}` : ''}
                </Text>
                <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                  {Math.round(amt.macros.calories)} kcal
                </Text>
              </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      {gramPresetsExtra.length > 0 ? (
        <View style={{ gap: t.spacing.xs }}>
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
            {LOG_COPY.gramPresetHint}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
            {gramPresetsExtra.map((preset) => (
              <Pressable
                key={preset.id}
                onPress={() => {
                  setSelectedPriorAmountId(null);
                  const unitLabel = preset.label.replace(/^[\d.]+/, '');
                  const matched =
                    intakeUnits.find(
                      (u) =>
                        u.kind === 'portion' &&
                        u.label === unitLabel &&
                        u.servingGrams === preset.grams,
                    ) ||
                    intakeUnits.find((u) => u.kind === 'portion' && u.label === unitLabel);
                  if (matched) {
                    setNutritionDraft(null);
                    setNutritionMacrosLocked(false);
                    setIntakeUnitId(matched.id);
                    setAmountInput('1');
                    setNutritionGrams(formatScaledMacroForForm(preset.grams));
                    const m = macrosForIntakeAmount(matched, '1');
                    if (m) applyMacros(m);
                    else onNutritionGramsChange(String(preset.grams));
                  } else {
                    onNutritionGramsChange(String(preset.grams));
                  }
                }}
                style={({ pressed }) => ({
                  paddingVertical: t.spacing.sm,
                  paddingHorizontal: t.spacing.md,
                  borderRadius: t.radius.md,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  backgroundColor: pressed ? t.colors.surface2 : t.colors.surface,
                })}
                accessibilityRole="button"
                accessibilityLabel={`${preset.label} ${preset.grams}그램`}
              >
                <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
                  {preset.label}
                </Text>
                <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                  {preset.grams}g
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      {nutritionDraft ? (
        <>
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
            {LOG_COPY.nutritionDbSource}
          </Text>
          {nutritionMacrosLocked ? (
            <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
              {LOG_COPY.nutritionDbLockedHint}
            </Text>
          ) : null}
        </>
      ) : null}
      <View ref={caloriesFieldRef} collapsable={false}>
        <LabeledField
          label="칼로리 (kcal)"
          value={calories}
          onChangeText={lockNutritionMacrosOnEdit(setCalories)}
          keyboardType="numeric"
          placeholder="0"
          onFocus={() => scrollFieldIntoView(caloriesFieldRef)}
        />
      </View>
      <View ref={proteinFieldRef} collapsable={false}>
        <LabeledField
          label="단백질 (g)"
          value={protein}
          onChangeText={lockNutritionMacrosOnEdit(setProtein)}
          keyboardType="numeric"
          placeholder="0"
          onFocus={() => scrollFieldIntoView(proteinFieldRef)}
        />
      </View>
      <View ref={carbohydrateFieldRef} collapsable={false}>
        <LabeledField
          label="탄수화물 (g)"
          value={carbohydrate}
          onChangeText={lockNutritionMacrosOnEdit(setCarbohydrate)}
          keyboardType="numeric"
          placeholder="0"
          onFocus={() => scrollFieldIntoView(carbohydrateFieldRef)}
        />
      </View>
      <View ref={fatFieldRef} collapsable={false}>
        <LabeledField
          label="지방 (g)"
          value={fat}
          onChangeText={lockNutritionMacrosOnEdit(setFat)}
          keyboardType="numeric"
          placeholder="0"
          onFocus={() => scrollFieldIntoView(fatFieldRef)}
        />
      </View>
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
        scrollRef={scrollRef}
        onScroll={onLogScroll}
        keyboardAvoiding
        contentPaddingBottomExtra={180}
      >
        {ent ? <Chip label={LOG_COPY.photoAnalysisChip(ent.ocrQuotaUsed, ent.ocrQuotaLimit)} /> : null}

        {targetYmd ? (
          <Banner
            variant="info"
            actionLabel={LOG_COPY.pastLogSwitchToday}
            onAction={() => navigation.setParams({ targetYmd: undefined })}
          >
            {LOG_COPY.pastLogBanner(formatKstDayTitle(targetYmd))}
          </Banner>
        ) : null}

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

        <PrimaryButton
          title={MEAL_SET_COPY.logEntryCta}
          onPress={() => navigation.navigate('MealSetList')}
          variant="secondary"
        />

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
              <Banner variant="info">
                {LOG_COPY.editBanner(editingOriginalName?.trim() || name.trim() || selectedTpl?.name || '식사')}
              </Banner>
            ) : null}
            {lastOcrMeta && lastOcrMeta.confidence < 0.6 ? (
              <Banner variant="warn">{LOG_COPY.ocrLowConfidence}</Banner>
            ) : null}
            {!editingMealId && formHasPrefill && !nutritionDraft ? (
              <PrimaryButton
                title={LOG_COPY.switchToManual}
                onPress={switchToManualEntry}
                variant="secondary"
              />
            ) : null}

            {macroFields}


            <View style={{ gap: t.spacing.sm, marginTop: t.spacing.sm }}>
              <PrimaryButton
                title={editingMealId ? LOG_COPY.saveEdit : LOG_COPY.addMeal}
                onPress={requestSaveMeal}
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
                  <PrimaryButton title={LOG_COPY.cancelEdit} onPress={resetForm} variant="secondary" />
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
                {hasToday ? (
                  <View style={{ gap: t.spacing.xs, marginBottom: t.spacing.sm }}>
                    <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                      {LOG_COPY.todayEditHint}
                    </Text>
                    <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                      {LOG_COPY.todayPortionHint}
                    </Text>
                    <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                      {LOG_COPY.nutritionDbListPortionHint}
                    </Text>
                  </View>
                ) : null}
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
                        {section.items.map((item) => {
                          const qtyDisp = listMealQuantityDisplay(item, tplById);
                          const showStepper = canAdjustPortionInList(item, tplById);
                          return (
                            <View
                              key={item.mealId}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: t.spacing.sm,
                                paddingVertical: t.spacing.sm,
                                borderBottomWidth: 1,
                                borderBottomColor: t.colors.border,
                              }}
                            >
                              <Pressable
                                onPress={() => startEditMeal(item)}
                                style={{ flex: 1, minWidth: 0 }}
                                accessibilityRole="button"
                              >
                                <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
                                  {mealRowSubtitle(item)}
                                </Text>
                                <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                                  {item.calories} kcal · {formatMacroLine(item)}
                                </Text>
                              </Pressable>
                              {showStepper && qtyDisp ? (
                                <MealPortionStepper
                                  quantity={qtyDisp.quantity}
                                  unitLabel={qtyDisp.unitLabel}
                                  stepMode={qtyDisp.stepMode}
                                  busy={portionBusyMealId === item.mealId}
                                  disabled={portionBusyMealId != null && portionBusyMealId !== item.mealId}
                                  onChange={(nextQty) => void adjustMealPortion(item, nextQty)}
                                  onPressCurrent={() => openPortionInput(item)}
                                />
                              ) : qtyDisp ? (
                                <View style={{ minWidth: 52, alignItems: 'center' }}>
                                  <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '700' }}>
                                    {formatListMealQuantity(qtyDisp.quantity)}
                                  </Text>
                                  <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                                    {qtyDisp.unitLabel}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          );
                        })}
                      </View>
                    ),
                  )
                )}
              </Card>
              <PrimaryButton
                title={LOG_COPY.pastBrowseCta}
                onPress={() => navigation.navigate('PastMealBrowse')}
                variant="secondary"
              />
            </>
          );
        })()}
      </ScreenLayout>

      <PaywallModal
        visible={paywallOpen}
        onSubscribe={isPlayBillingEnabled ? () => void checkout() : undefined}
        onDismiss={() => setPaywallOpen(false)}
        busy={checkoutBusy}
      />
      <PortionQuantityModal
        visible={portionInputMeal != null}
        value={portionInputValue}
        unitLabel={
          portionInputMeal
            ? (listMealQuantityDisplay(portionInputMeal, tplById)?.unitLabel ?? 'g')
            : 'g'
        }
        busy={portionBusyMealId != null}
        onChangeValue={setPortionInputValue}
        onConfirm={() => void submitPortionInput()}
        onClose={closePortionInput}
      />
    </>
  );
}
