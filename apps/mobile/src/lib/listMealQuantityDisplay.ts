import type { FoodTemplateItem, MealRow } from '../api/meals';
import { effectiveMealGrams } from './adjustMealGramsCore';
import { formatTplAmount, unitHint } from './mealEntryForm';
import {
  NUTRITION_FOOD_GRAMS_MAX,
  NUTRITION_FOOD_GRAMS_MIN,
} from './nutritionFoodScale';
import { isLikelyUnsetManualGrams } from './unsetManualGrams';

export const MEAL_PORTION_QTY_MIN = 0.25;
export const MEAL_PORTION_QTY_MAX = 50;
export const MEAL_PORTION_STEP = 1;

export type ListMealStepMode = 'grams' | 'portion';

export type ListMealQuantityDisplay = {
  stepMode: ListMealStepMode;
  /** Display / stepper quantity (portion count or grams). */
  quantity: number;
  unitLabel: string;
  servingGrams: number | null;
  foodTemplateId: string | null;
};

export function buildFoodTemplateMap(
  templates: FoodTemplateItem[],
): Map<string, FoodTemplateItem> {
  return new Map(templates.map((t) => [t.id, t]));
}

/** AC-09: PORTION_COUNT + template → show N{unit}; else grams. No fake || 100. */
export function listMealQuantityDisplay(
  meal: MealRow,
  tplById: Map<string, FoodTemplateItem>,
): ListMealQuantityDisplay | null {
  const tplId = meal.foodTemplateId?.trim() || null;
  const tpl = tplId ? tplById.get(tplId) : undefined;
  const hasPortionQty =
    meal.mealInputMode === 'PORTION_COUNT' &&
    meal.portionQuantity != null &&
    Number.isFinite(meal.portionQuantity) &&
    meal.portionQuantity > 0;

  if (tplId && hasPortionQty) {
    if (tpl && tpl.servingGrams > 0) {
      return {
        stepMode: 'portion',
        quantity: meal.portionQuantity!,
        unitLabel: unitHint(tpl),
        servingGrams: tpl.servingGrams,
        foodTemplateId: tplId,
      };
    }
    // Template linked but not loaded — never fall through to grams ± (clears FK).
    return {
      stepMode: 'portion',
      quantity: meal.portionQuantity!,
      unitLabel: '단위',
      servingGrams: null,
      foodTemplateId: tplId,
    };
  }

  // Manual rows that only have server-default 100g: treat as no grams in list.
  if (isLikelyUnsetManualGrams(meal)) {
    return null;
  }

  const grams = effectiveMealGrams(meal.grams);
  if (!(grams > 0)) return null;

  return {
    stepMode: 'grams',
    quantity: grams,
    unitLabel: 'g',
    servingGrams: null,
    foodTemplateId: null,
  };
}

export function formatListMealQuantity(quantity: number): string {
  return formatTplAmount(quantity) || String(quantity);
}

export function nextMealPortionQuantity(
  currentQty: number,
  delta: number,
): number | null {
  if (!(currentQty > 0) || !Number.isFinite(currentQty)) return null;
  const next = Math.round((currentQty + delta) * 100) / 100;
  if (next < MEAL_PORTION_QTY_MIN || next > MEAL_PORTION_QTY_MAX) return null;
  if (Math.abs(next - currentQty) < 0.001) return null;
  return next;
}

export function portionQuantityToGrams(
  portionQty: number,
  servingGrams: number,
): number | null {
  if (!(portionQty > 0) || !(servingGrams > 0)) return null;
  const grams = Math.round(portionQty * servingGrams * 10) / 10;
  if (grams < NUTRITION_FOOD_GRAMS_MIN || grams > NUTRITION_FOOD_GRAMS_MAX) return null;
  return grams;
}

/** True when meal should stay on portion-unit list UX (개/접시…). */
export function isLegacyPortionMeal(
  meal: Pick<MealRow, 'foodTemplateId' | 'mealInputMode' | 'portionQuantity'>,
): boolean {
  return (
    Boolean(meal.foodTemplateId?.trim()) &&
    meal.mealInputMode === 'PORTION_COUNT' &&
    meal.portionQuantity != null &&
    Number.isFinite(meal.portionQuantity) &&
    meal.portionQuantity > 0
  );
}

/**
 * List −/+ is allowed only when quantity can be shown and safely adjusted.
 * PORTION_COUNT without a loaded template is visible but not ±-adjustable.
 */
export function canAdjustMealQuantityInList(
  meal: Pick<
    MealRow,
    'grams' | 'foodTemplateId' | 'mealInputMode' | 'portionQuantity'
  >,
  templates: FoodTemplateItem[] | Map<string, FoodTemplateItem>,
): boolean {
  const disp = listMealQuantityDisplay(meal, templates);
  if (disp == null) return false;
  if (disp.stepMode === 'portion' && !(disp.servingGrams != null && disp.servingGrams > 0)) {
    return false;
  }
  return true;
}

/** Map form grams → portionQuantity for template PUT (keeps 개/접시 display). */
export function gramsToPortionQuantity(
  grams: number,
  servingGrams: number,
): number | null {
  if (!(grams > 0) || !(servingGrams > 0)) return null;
  const qty = Math.round((grams / servingGrams) * 100) / 100;
  if (qty < MEAL_PORTION_QTY_MIN || qty > MEAL_PORTION_QTY_MAX) return null;
  return qty;
}
