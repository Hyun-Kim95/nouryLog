import { userStatsAggregationMeta } from '../../lib/userStatsAggregationMeta.js';
import { todayAnchorKst } from '../../lib/statsPeriod.js';
import { aggregateMealsForAiPeriod } from './aiMealAggregate.js';
import { parseAiAnchor, resolveAiPeriodBounds } from './aiStatsPeriod.js';
import { computeMacroBreakdown, computeWeekGoalAchievement } from './aiCoachWeekMetrics.js';
import { buildMealPatternAnalysis } from './aiMealPatterns.js';
import { buildPeriodPatternSummary, DISCLAIMER } from './aiTemplateAnswer.js';
import { getCachedPeriodReport, setCachedPeriodReport } from './aiPeriodReportCache.js';

export async function handleWeeklyReport(userId: string, anchorRaw?: string | null) {
  const anchorParsed = parseAiAnchor(anchorRaw ?? todayAnchorKst());
  if (anchorParsed.error) {
    const err = new Error('future_anchor');
    (err as Error & { code: string; field: string }).code = 'VALIDATION_FAILED';
    (err as Error & { field: string }).field = 'anchor';
    throw err;
  }

  const kind = 'week_single' as const;
  const period = resolveAiPeriodBounds(kind, anchorParsed.anchor);
  const cached = await getCachedPeriodReport<Awaited<ReturnType<typeof buildWeeklyPayload>>>(
    userId,
    'week',
    anchorParsed.anchor,
    period.from,
    period.toExclusive,
  );
  if (cached) return cached;

  const payload = await buildWeeklyPayload(userId, anchorParsed.anchor);
  await setCachedPeriodReport(
    userId,
    'week',
    anchorParsed.anchor,
    period.from,
    period.toExclusive,
    payload,
  );
  return payload;
}

async function buildWeeklyPayload(userId: string, anchor: string) {
  const kind = 'week_single' as const;
  const agg = await aggregateMealsForAiPeriod(userId, kind, anchor);
  const period = resolveAiPeriodBounds(kind, anchor);
  const { computed, citations } = agg;
  const s = computed.summary;

  const macroBreakdown = computeMacroBreakdown(s);
  const goalAchievement = await computeWeekGoalAchievement(userId, anchor);
  const { proteinMetDays, calorieMetDays, countedDays } = goalAchievement;

  const analysis = await buildMealPatternAnalysis(userId, kind, anchor, agg);

  const highlights: Array<{ type: string; citationIndex?: number; date?: string }> = [];
  const mealCitations = citations.filter((c) => c.type === 'meal');
  if (mealCitations.length > 0) {
    highlights.push({ type: 'top_protein_meal', citationIndex: citations.indexOf(mealCitations[0]!) });
  }

  const summaryText = buildPeriodPatternSummary(agg, analysis);
  const meta = userStatsAggregationMeta(new Date());

  return {
    generatedAt: new Date().toISOString(),
    period: {
      anchor: period.anchor,
      from: period.from.toISOString(),
      toExclusive: period.toExclusive.toISOString(),
      label: period.label,
      timezone: 'Asia/Seoul' as const,
    },
    sections: {
      overview: {
        mealCount: computed.mealCount,
        recordedDays: computed.periodMeta.recordedDays,
        summary: s,
      },
      macroBreakdown,
      goalAchievement: { proteinMetDays, calorieMetDays, countedDays },
      highlights,
      suggestions: analysis.nextGoals,
      keyMetrics: analysis.keyMetrics,
      patterns: analysis.patterns,
      evidence: analysis.evidence,
      nextWeekGoals: analysis.nextGoals,
    },
    summaryText,
    citations,
    isStale: meta.isStale,
    staleHours: meta.staleHours,
    aggregatedAt: meta.aggregatedAt.toISOString(),
    disclaimer: DISCLAIMER,
  };
}
