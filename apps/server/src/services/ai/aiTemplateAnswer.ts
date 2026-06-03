import type { AiAggregateResult } from './aiMealAggregate.js';
import type { StatsQueryPlan } from './aiIntent.js';

const DISCLAIMER =
  '본 답변은 추정 권장값·일반 정보이며, 의료 진단·치료·처방을 대체하지 않습니다.';

export function buildTemplateAskAnswer(
  question: string,
  plan: StatsQueryPlan,
  agg: AiAggregateResult,
): string {
  const { computed } = agg;
  const { summary, goalComparison, period } = computed;

  if (computed.mealCount === 0) {
    return `${period.label} 기간에 등록된 식단 기록이 없습니다. 기록을 추가한 뒤 다시 질문해 주세요. ${DISCLAIMER}`;
  }

  const parts: string[] = [];
  parts.push(`${period.label} 기준 기록일 일평균 영양소는 다음과 같습니다.`);

  if (plan.focus === 'protein' || plan.focus === 'general') {
    parts.push(`단백질 평균 ${summary.protein}g`);
  }
  if (plan.focus === 'calories' || plan.focus === 'general') {
    parts.push(`칼로리 평균 ${summary.calories}kcal`);
  }
  if (plan.focus === 'general') {
    parts.push(`탄수화물 ${summary.carbohydrate}g, 지방 ${summary.fat}g`);
  }

  if (goalComparison) {
    const gap = goalComparison.proteinAvgGapG;
    const gapText =
      gap === 0
        ? '목표와 동일합니다'
        : gap > 0
          ? `목표보다 ${gap}g 많습니다`
          : `목표보다 ${Math.abs(gap)}g 부족합니다`;
    parts.push(
      `단백질 목표 ${goalComparison.proteinGoalG}g 대비 ${gapText}. 칼로리 목표 ${goalComparison.calorieGoalKcal}kcal ${goalComparison.calorieMet ? '충족' : '미충족'}.`,
    );
  } else {
    parts.push('프로필에 목표가 설정되어 있지 않아 섭취량만 안내합니다.');
  }

  parts.push(`(질문: ${question.slice(0, 80)}${question.length > 80 ? '…' : ''})`);
  parts.push(DISCLAIMER);
  return parts.join(' ');
}

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

export { DISCLAIMER };
