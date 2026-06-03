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

export function classifyAiIntent(question: string): StatsQueryPlan | { intent: Exclude<AiIntent, 'stats_query'> } {
  const q = question.trim();
  if (!q) return { intent: 'unknown' };

  if (/영양지식|일반적으로|권장량이란|무엇인가요/i.test(q) && !PROTEIN_RE.test(q) && !CALORIE_RE.test(q)) {
    return { intent: 'knowledge_query' };
  }
  if (/비슷한\s*식사|먹었던|기억|검색/i.test(q)) {
    return { intent: 'semantic_meal' };
  }

  let periodKind: AiPeriodKind = 'week_single';
  if (DAY_RE.test(q)) periodKind = 'day_single';
  else if (MONTH_RE.test(q)) periodKind = 'month_single';
  else if (WEEK_RE.test(q)) periodKind = 'week_single';
  else if (PROTEIN_RE.test(q) || CALORIE_RE.test(q)) periodKind = 'week_single';

  let focus: StatsQueryPlan['focus'] = 'general';
  if (PROTEIN_RE.test(q)) focus = 'protein';
  else if (CALORIE_RE.test(q)) focus = 'calories';

  return { intent: 'stats_query', periodKind, focus };
}
