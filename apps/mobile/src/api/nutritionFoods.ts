import { apiFetch } from '../api';

export type NutritionFoodItem = {
  id: string;
  source: string;
  externalId: string;
  name: string;
  category: string | null;
  per100g: {
    calories: number;
    protein: number;
    fat: number;
    carbohydrate: number;
  };
  defaultServingGrams: number | null;
};

export type NutritionFoodsPage = {
  items: NutritionFoodItem[];
  page: number;
  size: number;
  total: number;
};

export async function listNutritionFoods(
  token: string,
  params: { q: string; page?: number; size?: number; signal?: AbortSignal },
): Promise<NutritionFoodsPage> {
  const search = new URLSearchParams();
  search.set('q', params.q.trim());
  search.set('page', String(params.page ?? 1));
  search.set('size', String(params.size ?? 15));
  return apiFetch<NutritionFoodsPage>(`/me/nutrition-foods?${search}`, {
    token,
    signal: params.signal,
    onAuthFailure: 'silent',
  });
}
