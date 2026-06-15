import type { AiAggregateResult } from './aiMealAggregate.js';
import type { MealPatternAnalysis } from './aiMealPatterns.js';

const DISCLAIMER =
  '본 안내는 추정 권장값·기록 집계 기준이며, 의료 진단·치료·처방을 대체하지 않습니다.';

export function buildTemplateWeeklySummary(
  agg: AiAggregateResult,
  suggestions: string[],
): string {
  const { computed } = agg;
  if (computed.mealCount === 0) {
    return '이번 주 식단 기록이 없습니다. 기록을 추가하면 주간 리포트를 확인할 수 있습니다.';
  }
  const s = computed.summary;
  const sug = suggestions.length ? ` ${suggestions[0]}` : '';
  return (
    `${computed.period.label} 동안 ${computed.periodMeta.recordedDays}일 기록, ` +
    `일평균 단백질 ${s.protein}g·칼로리 ${s.calories}kcal입니다.${sug}`
  );
}

export function buildPeriodPatternSummary(agg: AiAggregateResult, analysis: MealPatternAnalysis): string {
  if (agg.computed.mealCount === 0) {
    return '이번 기간 식단 기록이 없습니다. 기록을 추가하면 리포트를 확인할 수 있습니다.';
  }
  const lines = analysis.patterns.map((p) => p.detail);
  const head = `${agg.computed.period.label} 기록 기준 요약입니다.`;
  return lines.length ? `${head} ${lines.join(' ')}` : buildTemplateWeeklySummary(agg, analysis.nextGoals);
}

export { DISCLAIMER };
