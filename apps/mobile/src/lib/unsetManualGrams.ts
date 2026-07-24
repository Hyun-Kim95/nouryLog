import type { MealRow } from '../api/meals';

/**
 * Grams missing / invalid → treat as unset for form empty + list (no fake || 100).
 * Positive grams are shown as entered — including intentional 100g (NF defaultServingGrams).
 * Legacy “omitted grams → server 100” can no longer be distinguished from real 100g;
 * Phase 1 requires explicit grams on save, so masking 100 hid valid NF/manual rows.
 */
export function isLikelyUnsetManualGrams(
  meal: Pick<MealRow, 'grams' | 'foodTemplateId' | 'mealInputMode' | 'portionQuantity'>,
): boolean {
  if (meal.grams == null || !Number.isFinite(meal.grams) || meal.grams <= 0) {
    return true;
  }
  return false;
}

/** Grams to show/edit; null means leave field empty. */
export function resolvedEditableGrams(meal: MealRow): number | null {
  if (isLikelyUnsetManualGrams(meal)) return null;
  if (meal.grams != null && Number.isFinite(meal.grams) && meal.grams > 0) {
    return meal.grams;
  }
  return null;
}
