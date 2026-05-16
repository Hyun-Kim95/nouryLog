import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from '../api';
import { getAccessToken } from '../authStorage';
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
import { parseManualNutrition } from '../lib/manualNutrition';
import {
  defaultMealSlotForNow,
  mealSlotLabel,
  MEAL_SLOT_OPTIONS,
  type MealSlot,
} from '../lib/mealSlot';
import { useTheme } from '../theme';
import { useToast } from '../toast/useToast';

type MealRow = {
  mealId: string;
  name: string;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  consumedAt: string;
  foodTemplateId?: string | null;
  mealInputMode?: string | null;
  portionQuantity?: number | null;
  mealSlot?: MealSlot | null;
};

type FoodTemplateItem = {
  id: string;
  name: string;
  memo: string | null;
  category: string | null;
  referenceAmount: number;
  portionUnit: string;
  portionLabel: string | null;
  servingGrams: number;
  calories: number;
  protein: number;
  fat: number;
  carbohydrate: number;
};

type Ent = {
  ocrQuotaLimit: number;
  ocrQuotaUsed: number;
  ocrPaidEnabled: boolean;
  nextPaywallTrigger: 'none' | 'ocr_remaining_1' | 'ocr_exhausted';
};

type EntryMode = 'manual' | 'template';
type TemplateInputMode = 'PORTION_COUNT' | 'TOTAL_GRAMS';

type OcrReview = {
  calories: number;
  carbohydrate: number;
  protein: number;
  fat: number;
  confidence: number;
  missingFields: string[];
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

export function LogScreen() {
  const t = useTheme();
  const toast = useToast();
  const [items, setItems] = useState<MealRow[]>([]);
  const [recentMeals, setRecentMeals] = useState<MealRow[]>([]);
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbohydrate, setCarbohydrate] = useState('');
  const [fat, setFat] = useState('');
  const [mealSlot, setMealSlot] = useState<MealSlot>(() => defaultMealSlotForNow());
  const [ent, setEnt] = useState<Ent | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [ocrReview, setOcrReview] = useState<OcrReview | null>(null);

  const [entryMode, setEntryMode] = useState<EntryMode>('manual');
  const [templates, setTemplates] = useState<FoodTemplateItem[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [selectedTpl, setSelectedTpl] = useState<FoodTemplateItem | null>(null);
  const [mealInputMode, setMealInputMode] = useState<TemplateInputMode>('PORTION_COUNT');
  const [tplAmount, setTplAmount] = useState('1');

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

  const load = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    const res = await apiFetch<{ items: MealRow[] }>('/meals?page=1&size=15', { token });
    setItems(res.items);
    const recent = await apiFetch<{ items: MealRow[] }>('/meals?page=1&size=20', { token });
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

  useFocusReload(
    useCallback(
      async ({ silent }: { silent: boolean }) => {
        await load().catch(() => setItems([]));
        await loadEntitlements();
        if (!silent && entryMode === 'template') {
          await loadTemplates();
        }
      },
      [load, loadEntitlements, entryMode, loadTemplates],
    ),
  );

  useEffect(() => {
    if (entryMode === 'template') {
      void loadTemplates();
    }
  }, [entryMode, loadTemplates]);

  const inputStyle = {
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.md,
    padding: t.spacing.md,
    color: t.colors.fg,
    backgroundColor: t.colors.surface,
    fontSize: t.fontSize.body,
  };

  const applyManualFromMeal = (m: MealRow) => {
    setEntryMode('manual');
    setOcrReview(null);
    setName(m.name);
    setCalories(String(Math.round(m.calories)));
    setProtein(String(Math.round(m.protein)));
    setCarbohydrate(String(Math.round(m.carbohydrate)));
    setFat(String(Math.round(m.fat)));
    if (m.mealSlot) setMealSlot(m.mealSlot);
    toast.show({ kind: 'info', message: '입력란에 불러왔어요. 확인 후 저장해 주세요.' });
  };

  const applyRecentMeal = (m: MealRow) => {
    if (m.foodTemplateId) {
      const tpl = templates.find((x) => x.id === m.foodTemplateId);
      if (tpl) {
        setEntryMode('template');
        setSelectedTpl(tpl);
        setMealInputMode(
          m.mealInputMode === 'TOTAL_GRAMS' ? 'TOTAL_GRAMS' : 'PORTION_COUNT',
        );
        setTplAmount(
          m.mealInputMode === 'PORTION_COUNT' && m.portionQuantity != null
            ? String(m.portionQuantity)
            : '1',
        );
        if (m.mealSlot) setMealSlot(m.mealSlot);
        setOcrReview(null);
        toast.show({ kind: 'info', message: '템플릿으로 불러왔어요.' });
        return;
      }
    }
    applyManualFromMeal(m);
  };

  const postMealBody = (
    base: Record<string, unknown>,
  ): Record<string, unknown> => ({
    ...base,
    mealSlot,
    consumedAt: new Date().toISOString(),
  });

  const addMeal = async () => {
    setSaveBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('로그인 필요');

      if (entryMode === 'template') {
        if (!selectedTpl) throw new Error('음식 템플릿을 선택해 주세요.');
        const amt = Number(String(tplAmount).replace(',', '.'));
        if (!Number.isFinite(amt) || amt <= 0) throw new Error('수량을 올바르게 입력해 주세요.');

        const body: Record<string, unknown> = {
          foodTemplateId: selectedTpl.id,
          mealInputMode,
        };
        if (mealInputMode === 'PORTION_COUNT') {
          body.portionQuantity = amt;
        } else {
          body.totalGrams = amt;
        }

        await apiFetch('/meals', {
          method: 'POST',
          token,
          body: JSON.stringify(postMealBody(body)),
        });
      } else {
        const nutrition = parseManualNutrition({ calories, protein, carbohydrate, fat });
        if (!name.trim()) throw new Error('음식명을 입력해 주세요.');
        await apiFetch('/meals', {
          method: 'POST',
          token,
          body: JSON.stringify(
            postMealBody({
              name: name.trim(),
              calories: nutrition.calories,
              protein: nutrition.protein,
              carbohydrate: nutrition.carbohydrate,
              fat: nutrition.fat,
            }),
          ),
        });
      }
      setOcrReview(null);
      toast.show({ kind: 'success', message: LOG_COPY.saveSuccess });
      await load();
    } catch (e) {
      toast.show({ kind: 'error', message: e instanceof Error ? e.message : '저장 실패' });
    } finally {
      setSaveBusy(false);
    }
  };

  const saveOcrReview = async () => {
    setSaveBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('로그인 필요');
      const nutrition = parseManualNutrition({ calories, protein, carbohydrate, fat });
      const mealName = name.trim() || '식사';
      await apiFetch('/meals', {
        method: 'POST',
        token,
        body: JSON.stringify(
          postMealBody({
            name: mealName,
            ...nutrition,
          }),
        ),
      });
      setOcrReview(null);
      toast.show({ kind: 'success', message: LOG_COPY.saveSuccess });
      await load();
    } catch (e) {
      toast.show({ kind: 'error', message: e instanceof Error ? e.message : '저장 실패' });
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
    setOcrReview({
      calories: res.calories,
      carbohydrate: res.carbohydrate,
      protein: res.protein,
      fat: res.fat,
      confidence: res.confidence,
      missingFields: res.missingFields ?? [],
    });
    setEntryMode('manual');
    setName((prev) => prev.trim() || '식사');
    setCalories(String(Math.round(res.calories)));
    setProtein(String(Math.round(res.protein)));
    setCarbohydrate(String(Math.round(res.carbohydrate)));
    setFat(String(Math.round(res.fat)));
    await loadEntitlements();
    toast.show({
      kind: 'info',
      message: `OCR 완료 · 남은 무료 ${res.remainingFreeQuota}회 · 값을 확인해 주세요`,
    });
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

      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) throw new Error('카메라 접근 권한이 필요합니다.');
        const picked = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          base64: true,
        });
        if (picked.canceled || !picked.assets[0]?.base64) {
          toast.show({ kind: 'info', message: '촬영이 취소되었습니다.' });
          return;
        }
        await runOcrWithBase64(picked.assets[0].base64);
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) throw new Error('갤러리 접근 권한이 필요합니다.');
        const picked = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          base64: true,
          allowsEditing: false,
        });
        if (picked.canceled || !picked.assets[0]?.base64) {
          toast.show({ kind: 'info', message: '이미지 선택이 취소되었습니다.' });
          return;
        }
        await runOcrWithBase64(picked.assets[0].base64);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'OCR 실패';
      if (msg.includes('무료 OCR') || msg.includes('한도')) {
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
      toast.show({ kind: 'error', message: e instanceof Error ? e.message : BILLING_COPY.actionError });
    } finally {
      setCheckoutBusy(false);
    }
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

  const macroFields = (
    <View style={{ gap: t.spacing.sm }}>
      <TextInput
        style={inputStyle}
        value={name}
        onChangeText={setName}
        placeholder="음식명"
        placeholderTextColor={t.colors.fgSubtle}
      />
      <TextInput
        style={inputStyle}
        value={calories}
        onChangeText={setCalories}
        keyboardType="numeric"
        placeholder={LOG_COPY.calories}
        placeholderTextColor={t.colors.fgSubtle}
      />
      <TextInput
        style={inputStyle}
        value={protein}
        onChangeText={setProtein}
        keyboardType="numeric"
        placeholder={LOG_COPY.protein}
        placeholderTextColor={t.colors.fgSubtle}
      />
      <TextInput
        style={inputStyle}
        value={carbohydrate}
        onChangeText={setCarbohydrate}
        keyboardType="numeric"
        placeholder={LOG_COPY.carb}
        placeholderTextColor={t.colors.fgSubtle}
      />
      <TextInput
        style={inputStyle}
        value={fat}
        onChangeText={setFat}
        keyboardType="numeric"
        placeholder={LOG_COPY.fat}
        placeholderTextColor={t.colors.fgSubtle}
      />
    </View>
  );

  return (
    <>
      <ScreenLayout title={LOG_COPY.title} subtitle={LOG_COPY.subtitle}>
        {ent ? <Chip label={`OCR ${ent.ocrQuotaUsed}/${ent.ocrQuotaLimit}회`} /> : null}

        {ent?.nextPaywallTrigger === 'ocr_remaining_1' ? (
          <Banner variant="warn">{LOG_COPY.ocrBannerRemaining}</Banner>
        ) : null}
        {ent?.nextPaywallTrigger === 'ocr_exhausted' && !ent.ocrPaidEnabled ? (
          <Banner variant="warn">{LOG_COPY.ocrBannerExhausted}</Banner>
        ) : null}

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

        {recentMeals.length > 0 ? (
          <Card>
            <CardTitle>{LOG_COPY.sectionRecent}</CardTitle>
            <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>{LOG_COPY.recentHint}</Text>
            <FlatList
              horizontal
              data={recentMeals}
              keyExtractor={(it) => it.mealId}
              style={{ maxHeight: 56 }}
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
                    maxWidth: 160,
                  }}
                >
                  <Text numberOfLines={1} style={{ color: t.colors.fg, fontWeight: '600', fontSize: t.fontSize.body }}>
                    {item.name}
                  </Text>
                  <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                    {Math.round(item.calories)} kcal
                  </Text>
                </Pressable>
              )}
            />
          </Card>
        ) : null}

        <Card>
          <CardTitle>{LOG_COPY.sectionSlot}</CardTitle>
          <Segmented<MealSlot>
            options={MEAL_SLOT_OPTIONS}
            value={mealSlot}
            onChange={setMealSlot}
          />
        </Card>

        {ocrReview ? (
          <Card>
            <CardTitle>{LOG_COPY.ocrReviewTitle}</CardTitle>
            <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>{LOG_COPY.ocrReviewHint}</Text>
            {ocrReview.confidence < 0.6 ? (
              <Banner variant="warn">{LOG_COPY.ocrLowConfidence}</Banner>
            ) : null}
            {macroFields}
            <PrimaryButton title={LOG_COPY.saveOcr} onPress={() => void saveOcrReview()} loading={saveBusy} />
            <TextButton title="OCR 결과 닫기" onPress={() => setOcrReview(null)} />
          </Card>
        ) : null}

        <Card>
          <CardTitle>{LOG_COPY.sectionEntry}</CardTitle>
          <Segmented<EntryMode>
            options={[
              { value: 'manual', label: LOG_COPY.entryManual },
              { value: 'template', label: LOG_COPY.entryTemplate },
            ]}
            value={entryMode}
            onChange={setEntryMode}
          />

          {entryMode === 'manual' ? (
            macroFields
          ) : (
            <View style={{ gap: t.spacing.sm }}>
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
                      onPress={() => setSelectedTpl(item)}
                      style={{
                        paddingHorizontal: t.spacing.md,
                        paddingVertical: t.spacing.sm,
                        borderRadius: t.radius.md,
                        borderWidth: 1,
                        borderColor: selectedTpl?.id === item.id ? t.colors.primary : t.colors.border,
                        backgroundColor:
                          selectedTpl?.id === item.id ? t.colors.surface2 : t.colors.surface,
                      }}
                    >
                      <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body }}>{item.name}</Text>
                    </Pressable>
                  )}
                />
              )}
              {selectedTpl ? (
                <>
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
                    onChange={setMealInputMode}
                  />
                  <TextInput
                    style={inputStyle}
                    value={tplAmount}
                    onChangeText={setTplAmount}
                    keyboardType="decimal-pad"
                    placeholder={
                      mealInputMode === 'PORTION_COUNT' ? `몇 ${unitHint(selectedTpl)}?` : '총 몇 g?'
                    }
                    placeholderTextColor={t.colors.fgSubtle}
                  />
                  {previewKcal != null ? (
                    <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                      예상 칼로리 약 {previewKcal} kcal
                    </Text>
                  ) : null}
                </>
              ) : null}
            </View>
          )}

          <PrimaryButton title={LOG_COPY.addMeal} onPress={() => void addMeal()} loading={saveBusy} />
        </Card>

        <Card>
          <CardTitle>{LOG_COPY.listTitle}</CardTitle>
          {items.length === 0 ? (
            <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>{LOG_COPY.listEmpty}</Text>
          ) : (
            items.map((item) => (
              <View
                key={item.mealId}
                style={{
                  paddingVertical: t.spacing.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: t.colors.border,
                }}
              >
                <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
                  {mealSlotLabel(item.mealSlot)} · {item.name}
                </Text>
                <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                  {item.calories} kcal · P {Math.round(item.protein)} · C {Math.round(item.carbohydrate)} · F{' '}
                  {Math.round(item.fat)} · {item.consumedAt.slice(0, 10)}
                </Text>
              </View>
            ))
          )}
        </Card>
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
