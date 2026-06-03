import { apiFetch } from '../api';

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
  | {
      type: 'knowledge_doc';
      sourceId: string;
      date: string;
      label: string;
    }
  | {
      type: 'ocr_feedback';
      sourceId: string;
      date: string;
      label: string;
    };

export type AiAskResponse = {
  answer: string;
  intent: string;
  citations: AiCitation[];
  computed: {
    period: {
      anchor: string;
      from: string;
      toExclusive: string;
      label: string;
      timezone: string;
      kind: string;
    };
    summary: { protein: number; calories: number; carbohydrate: number; fat: number };
    goalComparison: {
      proteinGoalG: number;
      proteinAvgGapG: number;
      proteinMet: boolean;
      calorieGoalKcal: number;
      calorieMet: boolean;
    } | null;
    mealCount: number;
    aggregation: string;
    periodMeta: { recordedDays: number; calendarDays: number };
  } | null;
  isStale: boolean;
  staleHours: number | null;
  aggregatedAt: string;
  llm: { provider: string; model: string; used: boolean };
  disclaimer: string;
};

const AI_ASK_TIMEOUT_MS = 45_000;

export async function postAiAsk(
  token: string,
  body: { question: string; contextAnchor?: string },
): Promise<AiAskResponse> {
  return apiFetch<AiAskResponse>('/me/ai/ask', {
    method: 'POST',
    token,
    timeoutMs: AI_ASK_TIMEOUT_MS,
    body: JSON.stringify(body),
  });
}

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

export async function getWeeklyReport(token: string, anchor?: string): Promise<WeeklyReportResponse> {
  const q = anchor ? `?anchor=${encodeURIComponent(anchor)}` : '';
  return apiFetch<WeeklyReportResponse>(`/me/ai/reports/weekly${q}`, { token });
}

export async function getMonthlyReport(token: string, anchor?: string): Promise<MonthlyReportResponse> {
  const q = anchor ? `?anchor=${encodeURIComponent(anchor)}` : '';
  return apiFetch<MonthlyReportResponse>(`/me/ai/reports/monthly${q}`, { token });
}

export type CoachGoalComparison = {
  proteinGoalG: number;
  proteinAvgGapG: number;
  proteinMet: boolean;
  calorieGoalKcal: number;
  calorieMet: boolean;
};

export type CoachPeriodBlock = {
  period: {
    anchor: string;
    from: string;
    toExclusive: string;
    label: string;
    timezone: string;
    kind: string;
  };
  summary: { protein: number; calories: number; carbohydrate: number; fat: number };
  goalComparison: CoachGoalComparison | null;
  mealCount: number;
};

export type CoachSummaryResponse = {
  anchor: string;
  today: CoachPeriodBlock;
  week: CoachPeriodBlock & {
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
  evidenceMeals: Extract<AiCitation, { type: 'meal' }>[];
  frequentFoods: Array<{ name: string; count: number }>;
  suggestedQuestions: Array<{
    label: string;
    question: string;
    intentHint?: 'stats_query' | 'semantic_meal' | 'knowledge_query';
  }>;
  citations: AiCitation[];
  isStale: boolean;
  staleHours: number | null;
  aggregatedAt: string;
  disclaimer: string;
};

export async function getCoachSummary(token: string, anchor?: string): Promise<CoachSummaryResponse> {
  const q = anchor ? `?anchor=${encodeURIComponent(anchor)}` : '';
  return apiFetch<CoachSummaryResponse>(`/me/ai/coach/summary${q}`, { token });
}
