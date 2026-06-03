import { apiFetchAuth } from '../apiWithAuth';

export type AiCitation =
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
    }
  | { type: 'knowledge_doc'; sourceId: string; date: string; label: string }
  | { type: 'ocr_feedback'; sourceId: string; date: string; label: string };

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
  citations: AiCitation[];
  isStale: boolean;
  staleHours: number | null;
  aggregatedAt: string;
  llm: { provider: string; model: string; used: boolean };
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
  citations: AiCitation[];
  isStale: boolean;
  staleHours: number | null;
  aggregatedAt: string;
  llm: { provider: string; model: string; used: boolean };
  disclaimer?: string;
};

export type AiAskResponse = {
  answer: string;
  intent: string;
  citations: AiCitation[];
  isStale: boolean;
  staleHours: number | null;
  llm: { provider: string; model: string; used: boolean };
  disclaimer: string;
};

export type CoachSummaryResponse = {
  anchor: string;
  insight: { text: string; source: string };
  week: {
    period: { label: string };
    recordedDays: number;
    mealCount: number;
    summary: { calories: number; protein: number; carbohydrate: number; fat: number };
    goalAchievement: {
      proteinShortDays: number;
      calorieShortDays: number;
      proteinMetDays: number;
      calorieMetDays: number;
      countedDays: number;
    };
    macroBreakdown: { proteinPct: number; carbPct: number; fatPct: number };
    goalComparison: {
      proteinGoalG: number;
      proteinAvgGapG: number;
      proteinMet: boolean;
      calorieGoalKcal: number;
      calorieMet: boolean;
    } | null;
  };
  today: {
    period: { label: string };
    summary: { calories: number; protein: number };
    goalComparison: {
      proteinGoalG: number;
      proteinMet: boolean;
      calorieGoalKcal: number;
      calorieMet: boolean;
    } | null;
  };
  suggestedQuestions: Array<{ label: string; question: string; intentHint?: string }>;
  evidenceMeals: Extract<AiCitation, { type: 'meal' }>[];
  frequentFoods: Array<{ name: string; count: number }>;
  isStale: boolean;
  staleHours: number | null;
  disclaimer: string;
};

export async function getWeeklyReport(anchor?: string) {
  const q = anchor ? `?anchor=${encodeURIComponent(anchor)}` : '';
  return apiFetchAuth<WeeklyReportResponse>(`/me/ai/reports/weekly${q}`);
}

export async function getMonthlyReport(anchor?: string) {
  const q = anchor ? `?anchor=${encodeURIComponent(anchor)}` : '';
  return apiFetchAuth<MonthlyReportResponse>(`/me/ai/reports/monthly${q}`);
}

export async function getCoachSummary(anchor?: string) {
  const q = anchor ? `?anchor=${encodeURIComponent(anchor)}` : '';
  return apiFetchAuth<CoachSummaryResponse>(`/me/ai/coach/summary${q}`);
}

export async function postAiAsk(body: { question: string; contextAnchor?: string }) {
  return apiFetchAuth<AiAskResponse>('/me/ai/ask', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
