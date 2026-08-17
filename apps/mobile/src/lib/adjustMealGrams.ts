import type { MealRow } from '../api/meals';
import { updateMeal } from '../api/meals';
import {
  assertValidMealGrams,
  effectiveMealGrams,
  scaleMacrosForGramsChange,
} from './adjustMealGramsCore';

export {
  MEAL_GRAMS_STEP,
  effectiveMealGrams,
  nextMealGrams,
  scaleMacrosForGramsChange,
} from './adjustMealGramsCore';

function mealSlotPatch(item: MealRow): Record<string, unknown> {
  return {
    mealSlot: item.mealSlot ?? null,
    snackPlacement: item.mealSlot === 'SNACK' ? (item.snackPlacement ?? null) : null,
  };
}

/** Phase 1 g-only: list −/+ adjusts grams and rescales macros. */
export async function adjustMealGramsOnServer(
  token: string,
  item: MealRow,
  nextGrams: number,
  portionSnapshot?: { quantity: number; label: string } | null,
): Promise<void> {
  const oldGrams = effectiveMealGrams(item.grams);
  if (!(oldGrams > 0)) {
    throw new Error('GRAMS_MISSING');
  }
  assertValidMealGrams(nextGrams);
  const nutrition = scaleMacrosForGramsChange(
    {
      calories: item.calories,
      protein: item.protein,
      carbohydrate: item.carbohydrate,
      fat: item.fat,
    },
    oldGrams,
    nextGrams,
  );
  const portionFields = portionSnapshot
    ? {
        mealInputMode: 'PORTION_COUNT',
        portionQuantity: portionSnapshot.quantity,
        portionLabel: portionSnapshot.label,
      }
    : {
        mealInputMode: 'TOTAL_GRAMS',
        portionQuantity: null,
        portionLabel: null,
      };
  await updateMeal(token, item.mealId, {
    ...mealSlotPatch(item),
    name: item.name,
    grams: nextGrams,
    foodTemplateId: null,
    ...portionFields,
    ...nutrition,
  });
}

/** Phase 1.1: PORTION_COUNT ±1 — server recomputes grams/macros from template. */
export async function adjustMealPortionCountOnServer(
  token: string,
  item: MealRow,
  nextPortionQty: number,
): Promise<void> {
  const tplId = item.foodTemplateId?.trim();
  if (!tplId) {
    throw new Error('TEMPLATE_MISSING');
  }
  if (!Number.isFinite(nextPortionQty) || nextPortionQty <= 0) {
    throw new Error('INVALID_PORTION');
  }
  await updateMeal(token, item.mealId, {
    ...mealSlotPatch(item),
    foodTemplateId: tplId,
    mealInputMode: 'PORTION_COUNT',
    portionQuantity: nextPortionQty,
  });
}
