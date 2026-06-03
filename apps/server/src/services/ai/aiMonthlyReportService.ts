import { isAiEnabled } from '../../lib/aiConfig.js';
import { userStatsAggregationMeta } from '../../lib/userStatsAggregationMeta.js';
import { todayAnchorKst } from '../../lib/statsPeriod.js';
import { aggregateMealsForAiPeriod } from './aiMealAggregate.js';
import { parseAiAnchor, resolveAiPeriodBounds } from './aiStatsPeriod.js';
import { computeMacroBreakdown } from './aiCoachWeekMetrics.js';
import { buildMealPatternAnalysis } from './aiMealPatterns.js';
import { narrateMonthlySummary } from './aiLlmNarrative.js';
import { DISCLAIMER } from './aiTemplateAnswer.js';
import { getCachedPeriodReport, setCachedPeriodReport } from './aiPeriodReportCache.js';

export async function handleMonthlyReport(userId: string, anchorRaw?: string | null) {
  if (!isAiEnabled()) {
    const err = new Error('ai_disabled');
    (err as Error & { code: string }).code = 'AI_LLM_UNAVAILABLE';
    throw err;
  }

  const anchorParsed = parseAiAnchor(anchorRaw ?? todayAnchorKst());
  if (anchorParsed.error) {
    const err = new Error('future_anchor');
    (err as Error & { code: string; field: string }).code = 'VALIDATION_FAILED';
    (err as Error & { field: string }).field = 'anchor';
    throw err;
  }

  const kind = 'month_single' as const;
  const period = resolveAiPeriodBounds(kind, anchorParsed.anchor);
  const cached = await getCachedPeriodReport<Awaited<ReturnType<typeof buildMonthlyPayload>>>(
    userId,
    'month',
    anchorParsed.anchor,
    period.from,
    period.toExclusive,
  );
  if (cached) return cached;

  const payload = await buildMonthlyPayload(userId, anchorParsed.anchor);
  await setCachedPeriodReport(
    userId,
    'month',
    anchorParsed.anchor,
    period.from,
    period.toExclusive,
    payload,
  );
  return payload;
}

async function buildMonthlyPayload(userId: string, anchor: string) {
  const kind = 'month_single' as const;
  const agg = await aggregateMealsForAiPeriod(userId, kind, anchor);
  const period = resolveAiPeriodBounds(kind, anchor);
  const { computed, citations } = agg;
  const s = computed.summary;
  const macroBreakdown = computeMacroBreakdown(s);
  const analysis = await buildMealPatternAnalysis(userId, kind, anchor, agg);

  const improvementTrends = analysis.patterns.filter((p) =>
    ['more_records', 'veg_improved'].includes(p.id),
  );
  const recurringPatterns = analysis.patterns.filter((p) =>
    !['more_records', 'veg_improved'].includes(p.id),
  );

  const { summaryText, llm } = await narrateMonthlySummary(agg, analysis);
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
      keyMetrics: analysis.keyMetrics,
      recurringPatterns,
      improvementTrends,
      breakfastSkipByWeekday: analysis.breakfastSkipByWeekday ?? [],
      evidence: analysis.evidence,
      nextMonthGoals: analysis.nextGoals,
      frequentFoods: analysis.frequentFoods,
    },
    comparison: analysis.comparison ?? null,
    summaryText,
    citations,
    isStale: meta.isStale,
    staleHours: meta.staleHours,
    aggregatedAt: meta.aggregatedAt.toISOString(),
    llm,
    disclaimer: DISCLAIMER,
  };
}
