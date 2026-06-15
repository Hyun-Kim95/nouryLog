import { apiFetch } from '../api';

export type InsightCitation =
  | {
      type: 'meal';
      mealId: string;
      date: string;
      foodName: string;
      mealSlot: string | null;
      nutrients: { protein: number; calories: number; carbohydrate: number; fat: number };
      label: string;
    }
  | {
      type: 'stat_period';
      date: string;
      label: string;
      nutrients: { protein: number; calories: number; carbohydrate: number; fat: number };
    };

export type PeriodKeyMetrics = {
  breakfastSkipDays: number;
  proteinShortMeals: number;
  outsideMealCount: number;
  vegetableMealCount: number;
};

export type PatternItem = { id: string; title: string; detail: string };

export type EvidenceItem = { date: string; slot: string; foodName: string; mealId?: string };

export type WeeklyReportResponse = {
  generatedAt: string;
  period: { anchor: string; from: string; toExclusive: string; label: string; timezone: string };
  sections: {
    overview: {
      mealCount: number;
      recordedDays: number;
      summary: { protein: number; calories: number; carbohydrate: number; fat: number };
    };
    macroBreakdown: { proteinPct: number; carbPct: number; fatPct: number };
    goalAchievement: { proteinMetDays: number; calorieMetDays: number; countedDays: number };
    highlights: Array<{ type: string; citationIndex?: number; date?: string }>;
    suggestions: string[];
    keyMetrics: PeriodKeyMetrics;
    patterns: PatternItem[];
    evidence: EvidenceItem[];
    nextWeekGoals: string[];
  };
  summaryText: string;
  citations: InsightCitation[];
  isStale: boolean;
  staleHours: number | null;
  aggregatedAt: string;
  disclaimer?: string;
};

export type MonthlyReportResponse = {
  generatedAt: string;
  period: { anchor: string; from: string; toExclusive: string; label: string; timezone: string };
  sections: {
    overview: {
      mealCount: number;
      recordedDays: number;
      summary: { protein: number; calories: number; carbohydrate: number; fat: number };
    };
    macroBreakdown: { proteinPct: number; carbPct: number; fatPct: number };
    keyMetrics: PeriodKeyMetrics;
    recurringPatterns: PatternItem[];
    improvementTrends: PatternItem[];
    breakfastSkipByWeekday: Array<{ weekday: string; skipDays: number }>;
    evidence: EvidenceItem[];
    nextMonthGoals: string[];
    frequentFoods: Array<{ name: string; count: number }>;
  };
  comparison: {
    recordedDaysDelta: number;
    vegetableMealDelta: number;
    outsideMealDelta: number;
    previousLabel: string;
  } | null;
  summaryText: string;
  citations: InsightCitation[];
  isStale: boolean;
  staleHours: number | null;
  aggregatedAt: string;
  disclaimer?: string;
};

export type InsightGoalComparison = {
  proteinGoalG: number;
  proteinAvgGapG: number;
  proteinMet: boolean;
  calorieGoalKcal: number;
  calorieMet: boolean;
};

export type InsightPeriodBlock = {
  period: {
    anchor: string;
    from: string;
    toExclusive: string;
    label: string;
    timezone: string;
    kind: string;
  };
  summary: { protein: number; calories: number; carbohydrate: number; fat: number };
  goalComparison: InsightGoalComparison | null;
  mealCount: number;
};

export type InsightSummaryResponse = {
  anchor: string;
  today: InsightPeriodBlock;
  week: InsightPeriodBlock & {
    recordedDays: number;
    goalAchievement: {
      proteinMetDays: number;
      calorieMetDays: number;
      countedDays: number;
      proteinShortDays: number;
      calorieShortDays: number;
    };
    macroBreakdown: { proteinPct: number; carbPct: number; fatPct: number };
  };
  insight: { text: string; source: string };
  evidenceMeals: Extract<InsightCitation, { type: 'meal' }>[];
  frequentFoods: Array<{ name: string; count: number }>;
  citations: InsightCitation[];
  isStale: boolean;
  staleHours: number | null;
  aggregatedAt: string;
  disclaimer: string;
};

export async function getInsightSummary(token: string, anchor?: string): Promise<InsightSummaryResponse> {
  const q = anchor ? `?anchor=${encodeURIComponent(anchor)}` : '';
  return apiFetch<InsightSummaryResponse>(`/me/insights/summary${q}`, { token });
}

export async function getWeeklyReport(token: string, anchor?: string): Promise<WeeklyReportResponse> {
  const q = anchor ? `?anchor=${encodeURIComponent(anchor)}` : '';
  return apiFetch<WeeklyReportResponse>(`/me/insights/reports/weekly${q}`, { token });
}

export async function getMonthlyReport(token: string, anchor?: string): Promise<MonthlyReportResponse> {
  const q = anchor ? `?anchor=${encodeURIComponent(anchor)}` : '';
  return apiFetch<MonthlyReportResponse>(`/me/insights/reports/monthly${q}`, { token });
}
