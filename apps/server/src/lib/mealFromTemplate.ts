export type TemplateNutritionRow = {
  servingGrams: number;
  calories: number;
  protein: number;
  fat: number;
  carbohydrate: number;
};

export function computeScaledNutritionFromGrams(
  template: TemplateNutritionRow,
  userTotalGrams: number,
): { grams: number; calories: number; protein: number; fat: number; carbohydrate: number } {
  const base = template.servingGrams;
  if (!(base > 0)) {
    throw new Error('INVALID_TEMPLATE_SERVING');
  }
  const scale = userTotalGrams / base;
  return {
    grams: userTotalGrams,
    calories: template.calories * scale,
    protein: template.protein * scale,
    fat: template.fat * scale,
    carbohydrate: template.carbohydrate * scale,
  };
}
