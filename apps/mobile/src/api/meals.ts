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
  grams?: number | null;
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
    q?: string;
  },
): Promise<{ items: MealRow[]; page: number; size: number; total: number }> {
  const q = new URLSearchParams();
  q.set('page', String(params.page ?? 1));
  q.set('size', String(params.size ?? 15));
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  if (params.excludeFoodTemplate) q.set('excludeFoodTemplate', 'true');
  if (params.q && params.q.trim()) q.set('q', params.q.trim());
  return apiFetch<{ items: MealRow[]; page: number; size: number; total: number }>(`/meals?${q}`, { token });
}

export type MealSlotKey = MealSlot | 'UNSPECIFIED';

export type MealSearchSummary = {
  q: string;
  total: number;
  lastConsumedAt: string | null;
  bySlot: Record<MealSlotKey, number>;
};

export async function fetchMealSearchSummary(
  token: string,
  params: { q: string; from?: string; to?: string; signal?: AbortSignal },
): Promise<MealSearchSummary> {
  const search = new URLSearchParams();
  search.set('q', params.q.trim());
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  return apiFetch<MealSearchSummary>(`/meals/search-summary?${search}`, {
    token,
    signal: params.signal,
  });
}

export async function createMeal(
  token: string,
  body: Record<string, unknown>,
  opts?: { timeoutMs?: number },
): Promise<{ mealId: string }> {
  return apiFetch<{ mealId: string }>('/meals', {
    method: 'POST',
    token,
    body: JSON.stringify(body),
    timeoutMs: opts?.timeoutMs,
  });
}

export async function updateMeal(token: string, mealId: string, body: Record<string, unknown>): Promise<void> {
  await apiFetch(`/meals/${mealId}`, { method: 'PUT', token, body: JSON.stringify(body) });
}

export async function deactivateMeal(token: string, mealId: string): Promise<void> {
  await apiFetch(`/meals/${mealId}/deactivate`, { method: 'PATCH', token });
}

export type MealEntrySuggestionItem =
  | { kind: 'template'; template: FoodTemplateItem }
  | { kind: 'past_meal'; meal: MealRow };

export async function fetchMealEntrySuggestions(
  token: string,
  params: { q: string; limit?: number; signal?: AbortSignal },
): Promise<{ items: MealEntrySuggestionItem[] }> {
  const search = new URLSearchParams();
  search.set('q', params.q.trim());
  search.set('limit', String(params.limit ?? 8));
  return apiFetch<{ items: MealEntrySuggestionItem[] }>(
    `/me/meal-entry-suggestions?${search}`,
    { token, signal: params.signal, onAuthFailure: 'silent' },
  );
}
