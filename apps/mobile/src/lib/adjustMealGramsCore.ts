import {
  clampNutritionFoodGrams,
  NUTRITION_FOOD_GRAMS_MAX,
  NUTRITION_FOOD_GRAMS_MIN,
} from './nutritionFoodScale';

export const MEAL_GRAMS_STEP = 10;

export function effectiveMealGrams(grams: number | null | undefined): number {
  if (grams != null && Number.isFinite(grams) && grams > 0) return grams;
  return 0;
}

export function nextMealGrams(currentGrams: number, delta: number): number | null {
  if (!(currentGrams > 0) || !Number.isFinite(currentGrams)) return null;
  const next = clampNutritionFoodGrams(currentGrams + delta);
  if (Math.abs(next - currentGrams) < 0.001) return null;
  return next;
}

export function scaleMacrosForGramsChange(
  macros: { calories: number; protein: number; carbohydrate: number; fat: number },
  oldGrams: number,
  newGrams: number,
): { calories: number; protein: number; carbohydrate: number; fat: number } {
  if (!(oldGrams > 0) || !Number.isFinite(oldGrams) || !Number.isFinite(newGrams)) {
    throw new Error('INVALID_GRAMS');
  }
  const scale = newGrams / oldGrams;
  return {
    calories: macros.calories * scale,
    protein: macros.protein * scale,
    carbohydrate: macros.carbohydrate * scale,
    fat: macros.fat * scale,
  };
}

export function assertValidMealGrams(nextGrams: number): void {
  if (
    !Number.isFinite(nextGrams) ||
    nextGrams < NUTRITION_FOOD_GRAMS_MIN ||
    nextGrams > NUTRITION_FOOD_GRAMS_MAX
  ) {
    throw new Error('INVALID_GRAMS');
  }
}
