import { apiFetchAuth } from '../apiWithAuth';
import type { StatsRange } from '../lib/statsPeriod';

export type NutritionSum = {
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
};

export type StatsResponse = {
  aggregatedAt: string;
  isStale: boolean;
  staleHours: number;
  timezone: string;
  aggregation?: 'dailyAverage';
  periodMeta?: { recordedDays: number; calendarDays: number };
  period: {
    anchor: string;
    from: string;
    toExclusive: string;
    label: string;
  };
  summary: NutritionSum;
  byMealSlot?: Record<string, NutritionSum>;
  daily?: Array<{
    date: string;
    label?: string;
    summary: NutritionSum;
    hasRecords: boolean;
  }>;
  goalAchievement?: {
    calorie: { metDays: number; countedDays: number; pct: number };
    protein: { metDays: number; countedDays: number; pct: number };
  };
};

export function fetchStats(range: StatsRange, anchor: string): Promise<StatsResponse> {
  const q = new URLSearchParams({ range, anchor });
  return apiFetchAuth<StatsResponse>(`/stats?${q}`);
}
