import type { FoodTemplateItem, MealRow } from '../api/meals';
import { effectiveMealGrams } from './adjustMealGramsCore';
import { formatTplAmount, unitHint } from './mealEntryForm';
import {
  NUTRITION_FOOD_GRAMS_MAX,
  NUTRITION_FOOD_GRAMS_MIN,
} from './nutritionFoodScale';

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
  const isPortionCount =
    tpl != null &&
    meal.mealInputMode === 'PORTION_COUNT' &&
    meal.portionQuantity != null &&
    Number.isFinite(meal.portionQuantity) &&
    meal.portionQuantity > 0 &&
    tpl.servingGrams > 0;

  if (isPortionCount && tpl && tplId) {
    return {
      stepMode: 'portion',
      quantity: meal.portionQuantity!,
      unitLabel: unitHint(tpl),
      servingGrams: tpl.servingGrams,
      foodTemplateId: tplId,
    };
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
