import type { FoodTemplateItem, MealRow } from '../api/meals';
import { updateMeal } from '../api/meals';
import { perServingValue, scaleManualNutritionForSave } from './manualPortion';
import { unitHint } from './mealEntryForm';

export async function adjustMealPortionOnServer(
  token: string,
  item: MealRow,
  nextQty: number,
): Promise<void> {
  const slotPatch: Record<string, unknown> = {
    mealSlot: item.mealSlot ?? null,
    snackPlacement: item.mealSlot === 'SNACK' ? (item.snackPlacement ?? null) : null,
  };
  if (item.foodTemplateId) {
    await updateMeal(token, item.mealId, {
      ...slotPatch,
      foodTemplateId: item.foodTemplateId,
      mealInputMode: 'PORTION_COUNT',
      portionQuantity: nextQty,
    });
    return;
  }
  const perServing = {
    calories: perServingValue(item.calories, item.portionQuantity),
    protein: perServingValue(item.protein, item.portionQuantity),
    carbohydrate: perServingValue(item.carbohydrate, item.portionQuantity),
    fat: perServingValue(item.fat, item.portionQuantity),
  };
  const nutrition = scaleManualNutritionForSave(perServing, nextQty);
  await updateMeal(token, item.mealId, {
    ...slotPatch,
    name: item.name,
    portionQuantity: nextQty,
    ...nutrition,
  });
}

export function portionUnitLabel(item: MealRow, templates: FoodTemplateItem[]): string {
  if (item.foodTemplateId) {
    const tpl = templates.find((x) => x.id === item.foodTemplateId);
    if (tpl) return unitHint(tpl);
  }
  return '인분';
}
