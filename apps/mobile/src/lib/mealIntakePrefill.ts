import type { FoodTemplateItem, MealRow } from '../api/meals';
import {
  formatListMealQuantity,
  listMealQuantityDisplay,
  portionQuantityToGrams,
  type ListMealQuantityDisplay,
} from './listMealQuantityDisplay';
import { formatScaledMacroForForm } from './nutritionFoodScale';
import { resolvedEditableGrams } from './unsetManualGrams';

export type MealIntakePrefill = {
  nutritionGrams: string;
  amountInput: string;
  intakeUnitId: string;
};

/** Prefer payload grams; else same mealId from local lists (구서버 제안 폴백). */
export function resolveMealForPrefill(meal: MealRow, caches: MealRow[]): MealRow {
  if (meal.grams != null && Number.isFinite(meal.grams) && meal.grams > 0) return meal;
  const hit = caches.find((x) => x.mealId === meal.mealId);
  if (!hit) return meal;
  return {
    ...meal,
    grams: hit.grams ?? meal.grams,
    foodTemplateId: meal.foodTemplateId ?? hit.foodTemplateId,
    mealInputMode: meal.mealInputMode ?? hit.mealInputMode,
    portionQuantity: meal.portionQuantity ?? hit.portionQuantity,
    portionLabel: meal.portionLabel ?? hit.portionLabel,
    mealSlot: meal.mealSlot ?? hit.mealSlot,
    snackPlacement: meal.snackPlacement ?? hit.snackPlacement,
  };
}

function portionUnitId(disp: ListMealQuantityDisplay): string | null {
  if (disp.stepMode !== 'portion') return null;
  if (!(disp.servingGrams != null && disp.servingGrams > 0)) return null;
  return `p:${disp.unitLabel}:${disp.servingGrams}`;
}

/**
 * Recent/suggestion tap → 섭취량·단위 폼 값.
 * PORTION+템플릿은 grams 없어도 수량×servingGrams로 채움.
 */
export function mealIntakePrefill(
  meal: MealRow,
  tplById: Map<string, FoodTemplateItem>,
): MealIntakePrefill {
  const disp = listMealQuantityDisplay(meal, tplById);
  const unitId = disp ? portionUnitId(disp) : null;
  if (disp && unitId) {
    const grams =
      resolvedEditableGrams(meal) ??
      portionQuantityToGrams(disp.quantity, disp.servingGrams!);
    if (grams != null) {
      return {
        nutritionGrams: formatScaledMacroForForm(grams),
        amountInput: formatListMealQuantity(disp.quantity),
        intakeUnitId: unitId,
      };
    }
  }

  const g = resolvedEditableGrams(meal);
  if (g != null) {
    return {
      nutritionGrams: formatScaledMacroForForm(g),
      amountInput: formatScaledMacroForForm(g),
      intakeUnitId: 'g',
    };
  }

  return { nutritionGrams: '', amountInput: '', intakeUnitId: 'g' };
}

export function mealQuantityCaption(
  meal: MealRow,
  tplById: Map<string, FoodTemplateItem>,
): string | null {
  const disp = listMealQuantityDisplay(meal, tplById);
  if (!disp) return null;
  return `${formatListMealQuantity(disp.quantity)}${disp.unitLabel}`;
}
