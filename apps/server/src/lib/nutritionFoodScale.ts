import { computeScaledNutritionFromGrams } from './mealFromTemplate.js';

export type Per100gMacros = {
  calories: number;
  protein: number;
  fat: number;
  carbohydrate: number;
};

export function scaleNutritionFromPer100g(
  per100g: Per100gMacros,
  grams: number,
): { grams: number; calories: number; protein: number; fat: number; carbohydrate: number } {
  if (!Number.isFinite(grams) || !(grams > 0)) {
    throw new Error('INVALID_GRAMS');
  }
  for (const v of [per100g.calories, per100g.protein, per100g.fat, per100g.carbohydrate]) {
    if (!Number.isFinite(v)) {
      throw new Error('INVALID_NUTRITION');
    }
  }
  return computeScaledNutritionFromGrams(
    {
      servingGrams: 100,
      calories: per100g.calories,
      protein: per100g.protein,
      fat: per100g.fat,
      carbohydrate: per100g.carbohydrate,
    },
    grams,
  );
}
