import type { AiPeriodKind } from './aiStatsPeriod.js';

export type AiIntent = 'stats_query' | 'knowledge_query' | 'semantic_meal' | 'unknown';

export type StatsQueryPlan = {
  intent: 'stats_query';
  periodKind: AiPeriodKind;
  focus: 'protein' | 'calories' | 'general';
};

const PROTEIN_RE = /단백|프로틴|protein/i;
const CALORIE_RE = /칼로리|열량|kcal|에너지/i;
const WEEK_RE = /이번\s*주|주간|일주일|한\s*주|weekly/i;
const MONTH_RE = /이번\s*달|한\s*달|월간|month/i;
const DAY_RE = /오늘|어제|하루|당일/i;

const SEMANTIC_RE = /비슷한\s*식사|먹었던|기억|검색/i;
const KNOWLEDGE_RE = /영양지식|일반적으로|권장량이란|무엇인가요/i;
const MEAL_LOGGING_HOWTO_RE = /식단\s*기록.*어떻게|어떻게\s*(시작|기록)|기록을\s*어떻게|기록\s*시작/i;
const NUTRITION_WHY_RE = /왜\s*(필요|중요)|무엇인가요|이란\s*무엇/i;
const MACRO_TOPIC_RE = /탄수|단백|지방|식이섬유|칼로리|열량|kcal|protein|carb|fiber|fat/i;
const MEDICAL_RE = /진단|처방|약물|병원|질병|의사/i;

const DIET_STATS_RE =
  /단백|프로틴|protein|칼로리|열량|kcal|에너지|탄수|지방|영양|식단|식사|섭취|기록|음식|끼니|아침|점심|저녁|간식|다이어트|체중|감량/i;

function hasDietOrNutritionSignal(q: string): boolean {
  return DIET_STATS_RE.test(q);
}

/** 주·월 기간만으로 stats 허용(예: 이번 주 어때). 일(오늘)만 있으면 식단 신호 동반 필요. */
function hasStatsPeriodSignal(q: string): boolean {
  if (WEEK_RE.test(q) || MONTH_RE.test(q)) return true;
  if (DAY_RE.test(q) && hasDietOrNutritionSignal(q)) return true;
  return false;
}

function resolveStatsPeriod(q: string): AiPeriodKind {
  if (DAY_RE.test(q)) return 'day_single';
  if (MONTH_RE.test(q)) return 'month_single';
  if (WEEK_RE.test(q)) return 'week_single';
  if (PROTEIN_RE.test(q) || CALORIE_RE.test(q)) return 'week_single';
  return 'week_single';
}

function resolveStatsFocus(q: string): StatsQueryPlan['focus'] {
  if (PROTEIN_RE.test(q)) return 'protein';
  if (CALORIE_RE.test(q)) return 'calories';
  return 'general';
}

export function classifyAiIntent(question: string): StatsQueryPlan | { intent: Exclude<AiIntent, 'stats_query'> } {
  const q = question.trim();
  if (!q) return { intent: 'unknown' };

  if (SEMANTIC_RE.test(q)) {
    return { intent: 'semantic_meal' };
  }

  if (MEDICAL_RE.test(q)) {
    return { intent: 'knowledge_query' };
  }

  if (KNOWLEDGE_RE.test(q) && !PROTEIN_RE.test(q) && !CALORIE_RE.test(q)) {
    return { intent: 'knowledge_query' };
  }

  if (MEAL_LOGGING_HOWTO_RE.test(q) && !hasStatsPeriodSignal(q)) {
    return { intent: 'knowledge_query' };
  }

  if (NUTRITION_WHY_RE.test(q) && MACRO_TOPIC_RE.test(q) && !hasStatsPeriodSignal(q)) {
    return { intent: 'knowledge_query' };
  }

  if (hasStatsPeriodSignal(q) || hasDietOrNutritionSignal(q)) {
    return {
      intent: 'stats_query',
      periodKind: resolveStatsPeriod(q),
      focus: resolveStatsFocus(q),
    };
  }

  return { intent: 'unknown' };
}
