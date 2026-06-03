import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
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
import { useFocusReload } from '../hooks/useFocusReload';
import { formatMacroLine } from '../lib/formatNutrition';
import { formatTplAmount as formatPortionAmount } from '../lib/mealEntryForm';
import { adjustMealPortionOnServer, portionUnitLabel } from '../lib/adjustMealPortion';
import {
  effectivePortionQty,
  parsePortionInput,
  roundPerServingForForm,
  scaleManualNutritionForSave,
} from '../lib/manualPortion';
import { parseManualNutrition } from '../lib/manualNutrition';
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
  const entrySectionY = useRef(0);
  const [recentMeals, setRecentMeals] = useState<MealRow[]>([]);
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
  const [lastOcrMeta, setLastOcrMeta] = useState<LastOcrMeta | null>(null);
  const [lastOcrSnapshot, setLastOcrSnapshot] = useState<OcrFieldSnapshot | null>(null);

  const [templates, setTemplates] = useState<FoodTemplateItem[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [selectedTpl, setSelectedTpl] = useState<FoodTemplateItem | null>(null);
  const [mealInputMode, setMealInputMode] = useState<TemplateInputMode>('PORTION_COUNT');
  const [tplAmount, setTplAmount] = useState('1');
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [portionBusyMealId, setPortionBusyMealId] = useState<string | null>(null);
  const [portionInputMeal, setPortionInputMeal] = useState<MealRow | null>(null);
  const [portionInputValue, setPortionInputValue] = useState('');
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
  }, []);

  const resetForm = useCallback(() => {
    setEditingMealId(null);
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
      const [todayRes, recent] = await Promise.all([
        listMeals(token, { page: 1, size: 100, from, to }),
        listMeals(token, { page: 1, size: 30, excludeFoodTemplate: true }),
      ]);
      setItems(todayRes.items ?? []);
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

  const newMealConsumedAt = (): string => {
    if (targetYmd) return kstNoonIsoFromYmd(targetYmd);
    return new Date().toISOString();
  };

  const mealBodyBase = (): Record<string, unknown> => {
    const base: Record<string, unknown> = {
      mealSlot,
      consumedAt: editingMealId ? consumedAt : newMealConsumedAt(),
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
          track(AnalyticsEvents.mealRecorded, {
            input_mode: 'template',
            meal_slot: mealSlot.toLowerCase(),
            from_ocr: false,
          });
        }
      } else {
        const perServing = parseManualNutrition({ calories, protein, carbohydrate, fat });
        if (!name.trim()) throw new Error(LOG_COPY.nameRequired);
        const portion = editingMealId ? parsePortionInput(manualPortion) : 1;
        const nutrition = scaleManualNutritionForSave(perServing, portion);
        const body = {
          ...mealBodyBase(),
          name: name.trim(),
          portionQuantity: portion,
          ...nutrition,
        };
        if (editingMealId) {
          await updateMeal(token, editingMealId, body);
        } else {
          const created = await createMeal(token, body);
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

      toast.show({
        kind: 'success',
        message: editingMealId ? LOG_COPY.editSuccess : LOG_COPY.saveSuccess,
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
    setSelectedTpl(null);
    setLastOcrMeta(null);
    setName(m.name);
    setManualPortion(
      m.portionQuantity != null ? formatPortionAmount(m.portionQuantity) || '1' : '1',
    );
    setCalories(roundPerServingForForm(m.calories, m.portionQuantity));
    setProtein(roundPerServingForForm(m.protein, m.portionQuantity));
    setCarbohydrate(roundPerServingForForm(m.carbohydrate, m.portionQuantity));
    setFat(roundPerServingForForm(m.fat, m.portionQuantity));
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
      await adjustMealPortionOnServer(token, item, nextQty);
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
    setPortionInputMeal(item);
    setPortionInputValue(String(effectivePortionQty(item.portionQuantity)));
  };

  const closePortionInput = () => {
    if (portionBusyMealId) return;
    setPortionInputMeal(null);
    setPortionInputValue('');
  };

  const submitPortionInput = async () => {
    if (!portionInputMeal) return;
    const nextQty = Number(String(portionInputValue).replace(',', '.'));
    if (!Number.isFinite(nextQty) || nextQty < 0.25 || nextQty > 50) {
      toast.show({ kind: 'error', message: '분량은 0.25~50 범위에서 입력해 주세요.' });
      return;
    }
    await adjustMealPortion(portionInputMeal, Math.round(nextQty * 100) / 100);
    setPortionInputMeal(null);
    setPortionInputValue('');
  };

  const applyRecentMeal = (m: MealRow) => {
    if (m.foodTemplateId) {
      const tpl = templates.find((x) => x.id === m.foodTemplateId);
      if (tpl) {
        setSelectedTpl(tpl);
        setMealInputMode('PORTION_COUNT');
        setTplAmount('1');
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

    let templateApplied = false;
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
        templateApplied = true;
      }
    }
    if (!templateApplied) {
      setSelectedTpl(null);
      setName(item.name);
      setManualPortion(
        item.portionQuantity != null ? formatPortionAmount(item.portionQuantity) || '1' : '1',
      );
      setCalories(roundPerServingForForm(item.calories, item.portionQuantity));
      setProtein(roundPerServingForForm(item.protein, item.portionQuantity));
      setCarbohydrate(roundPerServingForForm(item.carbohydrate, item.portionQuantity));
      setFat(roundPerServingForForm(item.fat, item.portionQuantity));
    }
    scheduleScrollToEntry();
  };

  const selectTemplate = (item: FoodTemplateItem) => {
    setSelectedTpl(item);
    setMealInputMode('PORTION_COUNT');
    setTplAmount(defaultTplAmount(item, 'PORTION_COUNT'));
    setManualPortion('1');
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
    editingMealId && selectedTpl && Number.isFinite(Number(tplAmount))
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

  const nameSuggestEnabled = nameFocused && !selectedTpl && name.trim().length >= 1;
  const { items: nameSuggestions, status: nameSuggestStatus, errorKind: nameSuggestErrorKind } =
    useMealEntrySuggestions(name, nameSuggestEnabled);
  const fallbackNameSuggestions = useMemo(() => {
    const needle = name.trim().toLowerCase();
    if (!needle) return [] as Array<{ kind: 'template'; template: FoodTemplateItem } | { kind: 'past_meal'; meal: MealRow }>;
    const picked: Array<{ kind: 'template'; template: FoodTemplateItem } | { kind: 'past_meal'; meal: MealRow }> = [];
    const seen = new Set<string>();
    for (const tpl of templates) {
      const n = tpl.name.trim();
      if (!n.toLowerCase().includes(needle)) continue;
      const key = n.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push({ kind: 'template', template: tpl });
      if (picked.length >= 8) return picked;
    }
    for (const meal of recentMeals) {
      const n = meal.name.trim();
      if (!n.toLowerCase().includes(needle)) continue;
      const key = n.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push({ kind: 'past_meal', meal });
      if (picked.length >= 8) return picked;
    }
    return picked;
  }, [name, templates, recentMeals]);
  const displayNameSuggestions = nameSuggestions.length > 0 ? nameSuggestions : fallbackNameSuggestions;

  const macroFields = (
    <View style={{ gap: t.spacing.sm }}>
      <View style={{ gap: t.spacing.xs, zIndex: 10 }}>
        <LabeledField
          label="음식명"
          value={name}
          onChangeText={handleNameChange}
          placeholder="예: 닭가슴살 샐러드"
          onFocus={() => {
            setNameFocused(true);
            focusEntryField();
          }}
          onBlur={() => {
            setTimeout(() => setNameFocused(false), 200);
          }}
        />
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
                  key={s.kind === 'template' ? `tpl-${s.template.id}` : s.meal.mealId}
                  onPress={() => {
                    if (s.kind === 'template') {
                      selectTemplate(s.template);
                    } else {
                      applyRecentMeal(s.meal);
                    }
                    setNameFocused(false);
                  }}
                  style={{
                    padding: t.spacing.md,
                    borderTopWidth: idx === 0 ? 0 : 1,
                    borderTopColor: t.colors.border,
                  }}
                >
                  <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
                    {s.kind === 'template' ? s.template.name : s.meal.name}
                    {s.kind === 'template' ? (
                      <Text style={{ color: t.colors.fgMuted, fontWeight: '400' }}>
                        {' '}
                        · {LOG_COPY.nameSuggestTemplate}
                      </Text>
                    ) : null}
                  </Text>
                  <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                    {s.kind === 'template' ? (
                      <>
                        {baselineSummary(s.template)} · {Math.round(s.template.calories)} kcal/1인분
                      </>
                    ) : (
                      <>
                        {formatMacroLine({
                          protein: s.meal.protein,
                          carbohydrate: s.meal.carbohydrate,
                          fat: s.meal.fat,
                        })}
                        {' · '}
                        {Math.round(s.meal.calories)} kcal
                      </>
                    )}
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
      {editingMealId ? (
        <LabeledField
          label={LOG_COPY.manualPortionLabel}
          value={manualPortion}
          onChangeText={setManualPortion}
          keyboardType="decimal-pad"
          placeholder="1"
          onFocus={focusEntryField}
        />
      ) : null}
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
        scrollRef={scrollRef}
        keyboardAvoiding
        contentPaddingBottomExtra={120}
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
                {!editingMealId ? ' · 저장 후 목록에서 분량 조절' : ''}
              </Text>
              {editingMealId ? (
                <>
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
                </>
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
                          const showStepper = canAdjustPortionInList(item);
                          const tpl = item.foodTemplateId
                            ? templates.find((x) => x.id === item.foodTemplateId)
                            : undefined;
                          const unitLabel = portionUnitLabel(item, templates);
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
                              {showStepper ? (
                                <MealPortionStepper
                                  quantity={effectivePortionQty(item.portionQuantity)}
                                  unitLabel={unitLabel}
                                  busy={portionBusyMealId === item.mealId}
                                  disabled={portionBusyMealId != null && portionBusyMealId !== item.mealId}
                                  onChange={(nextQty) => void adjustMealPortion(item, nextQty)}
                                  onPressCurrent={() => openPortionInput(item)}
                                />
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
        unitLabel={portionInputMeal ? portionUnitLabel(portionInputMeal, templates) : undefined}
        busy={portionBusyMealId != null}
        onChangeValue={setPortionInputValue}
        onConfirm={() => void submitPortionInput()}
        onClose={closePortionInput}
      />
    </>
  );
}
