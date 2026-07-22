import type { FoodTemplateItem, MealRow } from '../api/meals';
import { adjustMealGramsOnServer } from './adjustMealGrams';

/** @deprecated Phase 1: list adjust is grams; kept name for call-site compatibility. */
export async function adjustMealPortionOnServer(
  token: string,
  item: MealRow,
  nextGrams: number,
): Promise<void> {
  await adjustMealGramsOnServer(token, item, nextGrams);
}

export function portionUnitLabel(_item: MealRow, _templates: FoodTemplateItem[]): string {
  return 'g';
}
