import type { MealRow } from '../api/meals';

/**
 * Old manual saves often omitted grams → server stored 100.
 * Treat as "not entered" for UI (form empty, list no g stepper).
 * Template / intentional portion counts are kept.
 */
export function isLikelyUnsetManualGrams(meal: Pick<
  MealRow,
  'grams' | 'foodTemplateId' | 'mealInputMode' | 'portionQuantity'
>): boolean {
  if (meal.grams == null || !Number.isFinite(meal.grams) || meal.grams <= 0) {
    return true;
  }
  if (meal.foodTemplateId?.trim()) {
    return false;
  }
  if (meal.mealInputMode === 'PORTION_COUNT') {
    return false;
  }
  // Client used to always send portionQuantity=1 with omitted grams → 100.
  // Real multi-count without template is rare; qty≠1 means intentional amount.
  if (
    meal.portionQuantity != null &&
    Number.isFinite(meal.portionQuantity) &&
    Math.abs(meal.portionQuantity - 1) > 0.001
  ) {
    return false;
  }
  return Math.abs(meal.grams - 100) < 0.001;
}

/** Grams to show/edit; null means leave field empty. */
export function resolvedEditableGrams(meal: MealRow): number | null {
  if (isLikelyUnsetManualGrams(meal)) return null;
  if (meal.grams != null && Number.isFinite(meal.grams) && meal.grams > 0) {
    return meal.grams;
  }
  return null;
}
