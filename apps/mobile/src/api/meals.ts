import { apiFetch } from '../api';
import type { MealSlot, SnackPlacement } from '../lib/mealSlot';

export type FoodTemplateItem = {
  id: string;
  name: string;
  memo: string | null;
  category: string | null;
  referenceAmount: number;
  portionUnit: string;
  portionLabel: string | null;
  servingGrams: number;
  calories: number;
  protein: number;
  fat: number;
  carbohydrate: number;
};

export type MealRow = {
  mealId: string;
  name: string;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  consumedAt: string;
  foodTemplateId?: string | null;
  mealInputMode?: string | null;
  portionQuantity?: number | null;
  mealSlot?: MealSlot | null;
  snackPlacement?: SnackPlacement | null;
};

export type TemplateInputMode = 'PORTION_COUNT' | 'TOTAL_GRAMS';

export type CreateMealManualBody = {
  name: string;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  mealSlot?: MealSlot;
  snackPlacement?: SnackPlacement;
  consumedAt?: string;
};

export type CreateMealTemplateBody = {
  foodTemplateId: string;
  mealInputMode: TemplateInputMode;
  portionQuantity?: number;
  totalGrams?: number;
  mealSlot?: MealSlot;
  snackPlacement?: SnackPlacement;
  consumedAt?: string;
};

export async function listMeals(
  token: string,
  params: {
    page?: number;
    size?: number;
    from?: string;
    to?: string;
    excludeFoodTemplate?: boolean;
  },
): Promise<{ items: MealRow[] }> {
  const q = new URLSearchParams();
  q.set('page', String(params.page ?? 1));
  q.set('size', String(params.size ?? 15));
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  if (params.excludeFoodTemplate) q.set('excludeFoodTemplate', 'true');
  return apiFetch<{ items: MealRow[] }>(`/meals?${q}`, { token });
}

export async function createMeal(token: string, body: Record<string, unknown>): Promise<void> {
  await apiFetch('/meals', { method: 'POST', token, body: JSON.stringify(body) });
}

export async function updateMeal(token: string, mealId: string, body: Record<string, unknown>): Promise<void> {
  await apiFetch(`/meals/${mealId}`, { method: 'PUT', token, body: JSON.stringify(body) });
}

export async function deactivateMeal(token: string, mealId: string): Promise<void> {
  await apiFetch(`/meals/${mealId}/deactivate`, { method: 'PATCH', token });
}
