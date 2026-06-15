import { prisma } from '../../lib/prisma.js';
import { userStatsAggregationMeta } from '../../lib/userStatsAggregationMeta.js';
import { todayAnchorKst } from '../../lib/statsPeriod.js';
import { aggregateMealsForAiPeriod, type AiMealCitation } from './aiMealAggregate.js';
import { parseAiAnchor } from './aiStatsPeriod.js';
import { computeMacroBreakdown, computeWeekGoalAchievement } from './aiCoachWeekMetrics.js';
import { buildCoachInsight } from './aiCoachInsight.js';
import { formatMealCitationLabel } from './aiStatsPeriod.js';
import { DISCLAIMER } from './aiTemplateAnswer.js';

const EVIDENCE_MAX = 5;
const FREQUENT_FOODS_MAX = 5;

export async function countFrequentFoodsInWeek(
  userId: string,
  from: Date,
  toExclusive: Date,
): Promise<Array<{ name: string; count: number }>> {
  const meals = await prisma.meal.findMany({
    where: {
      userId,
      active: true,
      consumedAt: { gte: from, lt: toExclusive },
    },
    select: { name: true },
  });

  const counts = new Map<string, number>();
  for (const m of meals) {
    const key = m.name.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, FREQUENT_FOODS_MAX);
}

type WeekMealRow = {
  id: string;
  name: string;
  consumedAt: Date;
  protein: number;
  calories: number;
  carbohydrate: number;
  fat: number;
  mealSlot: string | null;
};

export async function fetchWeekMeals(
  userId: string,
  from: Date,
  toExclusive: Date,
): Promise<WeekMealRow[]> {
  return prisma.meal.findMany({
    where: {
      userId,
      active: true,
      consumedAt: { gte: from, lt: toExclusive },
    },
    select: {
      id: true,
      name: true,
      consumedAt: true,
      protein: true,
      calories: true,
      carbohydrate: true,
      fat: true,
      mealSlot: true,
    },
    orderBy: { consumedAt: 'asc' },
  });
}

export function mealRowToCitation(m: WeekMealRow): AiMealCitation {
  const date = m.consumedAt.toISOString().slice(0, 10);
  return {
    type: 'meal',
    mealId: m.id,
    date,
    foodName: m.name,
    mealSlot: m.mealSlot,
    nutrients: {
      protein: m.protein,
      calories: m.calories,
      carbohydrate: m.carbohydrate,
      fat: m.fat,
    },
    label: formatMealCitationLabel(date, m.mealSlot, m.name, m.protein),
  };
}

export function pickEvidenceMeals(
  weekMeals: WeekMealRow[],
  proteinGoalG: number | null | undefined,
): AiMealCitation[] {
  const threshold =
    proteinGoalG != null && proteinGoalG > 0 ? proteinGoalG * 0.35 : 15;

  const breakfastLow = weekMeals
    .filter((m) => m.mealSlot === 'BREAKFAST' && m.protein < threshold)
    .sort((a, b) => a.protein - b.protein)
    .slice(0, EVIDENCE_MAX)
    .map(mealRowToCitation);

  if (breakfastLow.length > 0) return breakfastLow;

  const topProtein = [...weekMeals]
    .sort((a, b) => b.protein - a.protein)
    .slice(0, EVIDENCE_MAX)
    .map(mealRowToCitation);

  return topProtein;
}

export async function handleInsightSummary(userId: string, anchorRaw?: string | null) {
  const anchorParsed = parseAiAnchor(anchorRaw ?? todayAnchorKst());
  if (anchorParsed.error) {
    const err = new Error('future_anchor');
    (err as Error & { code: string; field: string }).code = 'VALIDATION_FAILED';
    (err as Error & { field: string }).field = 'anchor';
    throw err;
  }

  const anchor = anchorParsed.anchor;

  const [todayAgg, weekAgg, goalAchievement] = await Promise.all([
    aggregateMealsForAiPeriod(userId, 'day_single', anchor),
    aggregateMealsForAiPeriod(userId, 'week_single', anchor),
    computeWeekGoalAchievement(userId, anchor),
  ]);

  const weekPeriod = weekAgg.computed.period;
  const from = new Date(weekPeriod.from);
  const toExclusive = new Date(weekPeriod.toExclusive);

  const [frequentFoods, weekMeals] = await Promise.all([
    countFrequentFoodsInWeek(userId, from, toExclusive),
    fetchWeekMeals(userId, from, toExclusive),
  ]);

  const macroBreakdown = computeMacroBreakdown(weekAgg.computed.summary);
  const insight = buildCoachInsight(weekAgg, goalAchievement);

  const evidenceMeals = pickEvidenceMeals(weekMeals, weekAgg.computed.goalComparison?.proteinGoalG);

  const citations = weekAgg.citations.slice(0, 6);

  const meta = userStatsAggregationMeta(new Date());

  return {
    anchor,
    today: {
      period: todayAgg.computed.period,
      summary: todayAgg.computed.summary,
      goalComparison: todayAgg.computed.goalComparison,
      mealCount: todayAgg.computed.mealCount,
    },
    week: {
      period: weekPeriod,
      summary: weekAgg.computed.summary,
      goalComparison: weekAgg.computed.goalComparison,
      mealCount: weekAgg.computed.mealCount,
      recordedDays: weekAgg.computed.periodMeta.recordedDays,
      goalAchievement,
      macroBreakdown,
    },
    insight,
    evidenceMeals,
    frequentFoods,
    citations,
    isStale: meta.isStale,
    staleHours: meta.staleHours,
    aggregatedAt: meta.aggregatedAt.toISOString(),
    disclaimer: DISCLAIMER,
  };
}

/** @deprecated use handleInsightSummary */
export const handleCoachSummary = handleInsightSummary;
