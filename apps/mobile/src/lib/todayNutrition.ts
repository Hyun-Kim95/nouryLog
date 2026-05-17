import { apiFetch } from '../api';
import { getProfile, type ProfileGetResponse } from '../api/profile';
import { localDayBounds } from './dateRange';

export type MealRow = {
  consumedAt: string;
  protein?: number | null;
  calories?: number | null;
  carbohydrate?: number | null;
  fat?: number | null;
};

export type TodayIntake = {
  proteinG: number;
  calorieKcal: number;
  carbohydrateG: number;
  fatG: number;
};

export type TodayGoals = {
  proteinGoalG: number | null;
  calorieGoalKcal: number | null;
  proteinGoalMinG: number | null;
  proteinGoalMaxG: number | null;
  calorieGoalMinKcal: number | null;
  calorieGoalMaxKcal: number | null;
  profile: ProfileGetResponse;
};

export function sumMeals(items: MealRow[]): TodayIntake {
  let proteinG = 0;
  let calorieKcal = 0;
  let carbohydrateG = 0;
  let fatG = 0;
  for (const m of items) {
    proteinG += Number(m.protein ?? 0);
    calorieKcal += Number(m.calories ?? 0);
    carbohydrateG += Number(m.carbohydrate ?? 0);
    fatG += Number(m.fat ?? 0);
  }
  return { proteinG, calorieKcal, carbohydrateG, fatG };
}

/** @deprecated 클라이언트 당일 필터 — from/to API 사용 권장 */
export function sumTodayMeals(items: MealRow[]): TodayIntake {
  const { from, to } = localDayBounds();
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  let proteinG = 0;
  let calorieKcal = 0;
  let carbohydrateG = 0;
  let fatG = 0;
  for (const m of items) {
    const t = new Date(m.consumedAt).getTime();
    if (t >= start && t <= end) {
      proteinG += Number(m.protein ?? 0);
      calorieKcal += Number(m.calories ?? 0);
      carbohydrateG += Number(m.carbohydrate ?? 0);
      fatG += Number(m.fat ?? 0);
    }
  }
  return { proteinG, calorieKcal, carbohydrateG, fatG };
}

export async function fetchTodayGoals(token: string): Promise<TodayGoals> {
  const profile = await getProfile(token);
  return {
    proteinGoalG: profile.proteinGoalG ?? null,
    calorieGoalKcal: profile.calorieGoalKcal ?? null,
    proteinGoalMinG: profile.proteinGoalMinG ?? null,
    proteinGoalMaxG: profile.proteinGoalMaxG ?? null,
    calorieGoalMinKcal: profile.calorieGoalMinKcal ?? null,
    calorieGoalMaxKcal: profile.calorieGoalMaxKcal ?? null,
    profile,
  };
}

export async function fetchTodayIntake(token: string): Promise<TodayIntake> {
  const { from, to } = localDayBounds();
  const q = new URLSearchParams({ page: '1', size: '100', from, to });
  const res = await apiFetch<{ items: MealRow[] }>(`/meals?${q}`, { token });
  return sumMeals(res.items ?? []);
}

/** @deprecated goalFulfillment 사용 */
export function pct(current: number, goal: number | null): number | null {
  if (goal == null || goal <= 0) return null;
  return Math.min(100, Math.round((current / goal) * 100));
}
