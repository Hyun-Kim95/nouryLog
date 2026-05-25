import type { ManualNutrition } from './manualNutrition';

export function effectivePortionQty(raw: number | null | undefined): number {
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return 1;
  return raw;
}

export function parsePortionInput(text: string): number {
  const n = Number(String(text).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('분량 수를 올바르게 입력해 주세요.');
  }
  return n;
}

export function perServingValue(total: number, portionQty: number | null | undefined): number {
  return total / effectivePortionQty(portionQty);
}

export function scaleManualNutritionForSave(perServing: ManualNutrition, portion: number): ManualNutrition {
  return {
    calories: perServing.calories * portion,
    protein: perServing.protein * portion,
    carbohydrate: perServing.carbohydrate * portion,
    fat: perServing.fat * portion,
  };
}

export function roundPerServingForForm(total: number, portionQty: number | null | undefined): string {
  return String(Math.round(perServingValue(total, portionQty)));
}
