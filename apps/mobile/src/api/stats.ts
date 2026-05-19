import { apiFetch } from '../api';
import type { StatsRange } from '../lib/statsPeriod';

export type NutritionSum = {
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
};

import type { FulfillmentStatus } from '../lib/goalFulfillment';

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
    goalMet: { calorie: boolean; protein: boolean };
    calorieStatus: FulfillmentStatus;
    hasRecords: boolean;
  }>;
  goalAchievement?: {
    calorie: { metDays: number; countedDays: number; pct: number };
    protein: { metDays: number; countedDays: number; pct: number };
  };
};

export async function fetchStats(
  token: string,
  range: StatsRange,
  anchor: string,
): Promise<StatsResponse> {
  return apiFetch<StatsResponse>(`/stats?range=${range}&anchor=${encodeURIComponent(anchor)}`, { token });
}
