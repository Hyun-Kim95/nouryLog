import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { apiFetch } from '../api';
import { listMeals, type FoodTemplateItem, type MealRow } from '../api/meals';
import { isAuthDenied } from '../api';
import { ensureAccessToken } from '../authSession';
import { adjustMealGramsOnServer, adjustMealPortionCountOnServer, effectiveMealGrams } from '../lib/adjustMealGrams';
import {
  MEAL_PORTION_QTY_MAX,
  MEAL_PORTION_QTY_MIN,
  buildFoodTemplateMap,
  formatListMealQuantity,
  gramsToPortionQuantity,
  isLegacyPortionMeal,
  listMealQuantityDisplay,
  normalizeMealPortionQuantity,
} from '../lib/listMealQuantityDisplay';
import {
  NUTRITION_FOOD_GRAMS_MAX,
  NUTRITION_FOOD_GRAMS_MIN,
} from '../lib/nutritionFoodScale';
import { canAdjustPortionInList, MealPortionStepper } from './MealPortionStepper';
import { PortionQuantityModal } from './PortionQuantityModal';
import { Banner, Card, CardTitle } from './ui';
import { LOG_COPY } from '../copy/log';
import { logAppError, toUserMessage } from '../lib/userFacingError';
import { kstDayBoundsFromYmd } from '../lib/dateRange';
import { formatMacroLine } from '../lib/formatNutrition';
import { groupMealsBySlotTimeline, mealRowSubtitle } from '../lib/mealTimeline';
import { useTheme } from '../theme';
import { useToast } from '../toast/useToast';

function sumMeals(meals: MealRow[]) {
  let calories = 0;
  let protein = 0;
  let carbohydrate = 0;
  let fat = 0;
  for (const m of meals) {
    calories += Number(m.calories ?? 0);
    protein += Number(m.protein ?? 0);
    carbohydrate += Number(m.carbohydrate ?? 0);
    fat += Number(m.fat ?? 0);
  }
  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbohydrate: Math.round(carbohydrate),
    fat: Math.round(fat),
  };
}

type Props = {
  date: string;
  reloadToken?: number;
  onEdit: (item: MealRow) => void;
  onDelete: (item: MealRow) => void;
};

export function MealDayTimelineCard({ date, reloadToken = 0, onEdit, onDelete }: Props) {
  const t = useTheme();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [meals, setMeals] = useState<MealRow[]>([]);
  const [templates, setTemplates] = useState<FoodTemplateItem[]>([]);
  const [portionBusyMealId, setPortionBusyMealId] = useState<string | null>(null);
  const [portionInputMeal, setPortionInputMeal] = useState<MealRow | null>(null);
  const [portionInputValue, setPortionInputValue] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const token = await ensureAccessToken();
      if (!token) return;
      const { from, to } = kstDayBoundsFromYmd(date);
      const res = await listMeals(token, { page: 1, size: 100, from, to });
      setMeals(res.items ?? []);
    } catch (e) {
      if (isAuthDenied(e)) return;
      logAppError('[MealDayTimeline] load', e);
      setMeals([]);
      setErr(toUserMessage(e, { context: 'meal', fallback: LOG_COPY.mealDayLoadError }));
    } finally {
      setLoading(false);
    }
  }, [date]);

  const loadTemplates = useCallback(async () => {
    const token = await ensureAccessToken();
    if (!token) return;
    try {
      const res = await apiFetch<{ items: FoodTemplateItem[] }>('/me/food-templates?page=1&size=100', {
        token,
      });
      setTemplates(res.items ?? []);
    } catch {
      setTemplates([]);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadTemplates();
  }, [load, loadTemplates, reloadToken]);

  const timeline = useMemo(() => groupMealsBySlotTimeline(meals), [meals]);
  const hasMeals = timeline.some((s) => s.items.length > 0);
  const summary = useMemo(() => sumMeals(meals), [meals]);
  const tplById = useMemo(() => buildFoodTemplateMap(templates), [templates]);

  const adjustPortion = async (item: MealRow, nextQty: number) => {
    setPortionBusyMealId(item.mealId);
    try {
      const token = await ensureAccessToken();
      if (!token) throw new Error('로그인 필요');
      const tplId = item.foodTemplateId?.trim() || null;
      const tpl = tplId ? tplById.get(tplId) : undefined;
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
      logAppError('[MealDayTimeline] portion', e);
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
      const portionQty = normalizeMealPortionQuantity(nextQty);
      if (
        !Number.isFinite(nextQty) ||
        portionQty < MEAL_PORTION_QTY_MIN ||
        portionQty > MEAL_PORTION_QTY_MAX
      ) {
        toast.show({ kind: 'error', message: LOG_COPY.portionQtyInvalid });
        return;
      }
      await adjustPortion(portionInputMeal, portionQty);
    } else {
      if (
        !Number.isFinite(nextQty) ||
        nextQty < NUTRITION_FOOD_GRAMS_MIN ||
        nextQty > NUTRITION_FOOD_GRAMS_MAX
      ) {
        toast.show({ kind: 'error', message: LOG_COPY.gramsInvalid });
        return;
      }
      await adjustPortion(portionInputMeal, Math.round(nextQty * 10) / 10);
    }
    setPortionInputMeal(null);
    setPortionInputValue('');
  };

  if (loading) {
    return (
      <View style={{ paddingVertical: t.spacing.xl, alignItems: 'center' }}>
        <ActivityIndicator color={t.colors.primary} />
      </View>
    );
  }

  if (err) {
    return (
      <Banner variant="danger" actionLabel={LOG_COPY.mealDayRetry} onAction={() => void load()}>
        {err}
      </Banner>
    );
  }

  if (!hasMeals) {
    return (
      <Card>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>{LOG_COPY.mealDayEmpty}</Text>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardTitle>{LOG_COPY.mealDaySummaryTitle}</CardTitle>
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>
          {summary.calories} kcal
        </Text>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>
          단백질 {summary.protein}g · 탄수 {summary.carbohydrate}g · 지방 {summary.fat}g
        </Text>
      </Card>

      <Card>
        <Text
          style={{
            color: t.colors.fgMuted,
            fontSize: t.fontSize.caption,
            marginBottom: t.spacing.sm,
          }}
        >
          {LOG_COPY.pastPortionHint}
        </Text>
        {timeline.map((section) =>
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
                      onPress={() => onEdit(item)}
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
                        onChange={(nextQty) => void adjustPortion(item, nextQty)}
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
                    <View style={{ flexShrink: 0, gap: t.spacing.xs, minWidth: showStepper ? 52 : 76 }}>
                      {!showStepper ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={LOG_COPY.pastEdit}
                          onPress={() => onEdit(item)}
                          style={({ pressed }) => ({
                            paddingVertical: t.spacing.sm,
                            paddingHorizontal: t.spacing.md,
                            borderRadius: t.radius.md,
                            borderWidth: 1,
                            borderColor: t.colors.border,
                            backgroundColor: pressed ? t.colors.surface2 : t.colors.surface,
                            alignItems: 'center',
                          })}
                        >
                          <Text style={{ color: t.colors.info, fontWeight: '700', fontSize: t.fontSize.caption }}>
                            {LOG_COPY.pastEdit}
                          </Text>
                        </Pressable>
                      ) : null}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={LOG_COPY.pastDelete}
                        onPress={() => onDelete(item)}
                        style={({ pressed }) => ({
                          paddingVertical: t.spacing.sm,
                          paddingHorizontal: t.spacing.md,
                          borderRadius: t.radius.md,
                          borderWidth: 1,
                          borderColor: t.colors.danger,
                          backgroundColor: pressed ? t.colors.surface2 : t.colors.surface,
                          alignItems: 'center',
                        })}
                      >
                        <Text style={{ color: t.colors.danger, fontWeight: '700', fontSize: t.fontSize.caption }}>
                          {LOG_COPY.pastDelete}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          ),
        )}
      </Card>
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
