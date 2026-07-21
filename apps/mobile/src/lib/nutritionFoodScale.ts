/** AC-03 동치: per100g × (grams/100), 반올림 없음. */

export type Per100gMacros = {
  calories: number;
  protein: number;
  fat: number;
  carbohydrate: number;
};

export type ScaledNutrition = {
  grams: number;
  calories: number;
  protein: number;
  fat: number;
  carbohydrate: number;
};

export const NUTRITION_FOOD_GRAMS_MIN = 1;
export const NUTRITION_FOOD_GRAMS_MAX = 5000;
export const NUTRITION_FOOD_NAME_MAX = 120;
export const NUTRITION_FOOD_Q_MAX = 60;

export function scaleNutritionFromPer100g(per100g: Per100gMacros, grams: number): ScaledNutrition {
  if (!Number.isFinite(grams) || !(grams > 0)) {
    throw new Error('INVALID_GRAMS');
  }
  for (const v of [per100g.calories, per100g.protein, per100g.fat, per100g.carbohydrate]) {
    if (!Number.isFinite(v)) {
      throw new Error('INVALID_NUTRITION');
    }
  }
  const scale = grams / 100;
  return {
    grams,
    calories: per100g.calories * scale,
    protein: per100g.protein * scale,
    fat: per100g.fat * scale,
    carbohydrate: per100g.carbohydrate * scale,
  };
}

export function clampNutritionFoodGrams(grams: number): number {
  if (!Number.isFinite(grams)) return 100;
  if (grams < NUTRITION_FOOD_GRAMS_MIN) return NUTRITION_FOOD_GRAMS_MIN;
  if (grams > NUTRITION_FOOD_GRAMS_MAX) return NUTRITION_FOOD_GRAMS_MAX;
  return grams;
}

/** defaultServingGrams 이상치 → 100 또는 clamp (PRD E-D9). */
export function resolveNutritionFoodDefaultGrams(defaultServingGrams: number | null | undefined): number {
  if (defaultServingGrams == null || !Number.isFinite(defaultServingGrams) || !(defaultServingGrams > 0)) {
    return 100;
  }
  return clampNutritionFoodGrams(defaultServingGrams);
}

export function parseNutritionFoodGramsInput(text: string): number {
  const n = Number(String(text).replace(',', '.').trim());
  if (!Number.isFinite(n)) {
    throw new Error('INVALID_GRAMS');
  }
  return n;
}

/** 표시용: 최대 1소수, 불필요 0 생략. */
export function formatScaledMacroForForm(value: number): string {
  if (!Number.isFinite(value)) return '';
  const rounded = Math.round(value * 10) / 10;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

export function buildNutritionFoodMealBody(params: {
  mealBodyBase: Record<string, unknown>;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  fat: number;
  carbohydrate: number;
  editing: boolean;
  existingPortionQuantity?: number | null;
}): Record<string, unknown> {
  const name = params.name.trim();
  if (!name) throw new Error('NAME_REQUIRED');
  if (name.length > NUTRITION_FOOD_NAME_MAX) throw new Error('NAME_TOO_LONG');
  if (
    !Number.isFinite(params.grams) ||
    params.grams < NUTRITION_FOOD_GRAMS_MIN ||
    params.grams > NUTRITION_FOOD_GRAMS_MAX
  ) {
    throw new Error('INVALID_GRAMS');
  }
  for (const [key, v] of Object.entries({
    calories: params.calories,
    protein: params.protein,
    fat: params.fat,
    carbohydrate: params.carbohydrate,
  })) {
    if (!Number.isFinite(v) || (v as number) < 0) {
      throw new Error(`INVALID_${key.toUpperCase()}`);
    }
  }
  const body: Record<string, unknown> = {
    ...params.mealBodyBase,
    name,
    grams: params.grams,
    calories: params.calories,
    protein: params.protein,
    fat: params.fat,
    carbohydrate: params.carbohydrate,
    foodTemplateId: null,
  };
  if (!params.editing) {
    body.portionQuantity = 1;
  } else if (params.existingPortionQuantity != null && Number.isFinite(params.existingPortionQuantity)) {
    body.portionQuantity = params.existingPortionQuantity;
  }
  return body;
}
