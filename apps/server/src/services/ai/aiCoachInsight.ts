import type { AiAggregateResult } from './aiMealAggregate.js';
import type { WeekGoalAchievement } from './aiCoachWeekMetrics.js';

export type CoachInsight = {
  text: string;
  source: 'template';
};

export function buildCoachInsight(
  weekAgg: AiAggregateResult,
  goalAchievement: WeekGoalAchievement,
): CoachInsight {
  const { computed } = weekAgg;

  if (computed.mealCount === 0 || goalAchievement.countedDays === 0) {
    return {
      text: '이번 주 식단 기록이 없습니다. 앱에서 기록을 추가하면 맞춤 코치 인사이트를 받을 수 있습니다.',
      source: 'template',
    };
  }

  const gc = computed.goalComparison;
  if (gc && gc.proteinAvgGapG < 0) {
    const gap = Math.abs(Math.round(gc.proteinAvgGapG));
    const short = goalAchievement.proteinShortDays;
    return {
      text: `이번 주 단백질 평균이 목표보다 ${gap}g 부족합니다. 단백질이 부족했던 날은 ${short}일입니다. 아침·간식에 단백질 식품을 추가해 보세요.`,
      source: 'template',
    };
  }

  if (gc && !gc.proteinMet && goalAchievement.proteinShortDays >= 3) {
    return {
      text: `이번 주 단백질 목표를 채운 날이 ${goalAchievement.proteinMetDays}일뿐입니다. 끼니별로 단백질 균형을 맞춰 보세요.`,
      source: 'template',
    };
  }

  if (goalAchievement.calorieShortDays >= 3 && gc?.calorieGoalKcal) {
    return {
      text: `이번 주 칼로리 목표를 맞추지 못한 날이 ${goalAchievement.calorieShortDays}일입니다. 끼니별 칼로리 균형을 점검해 보세요.`,
      source: 'template',
    };
  }

  if (gc?.proteinMet && gc.calorieMet) {
    return {
      text: '이번 주 단백질·칼로리 목표를 잘 지키고 있습니다. 현재 패턴을 유지해 보세요.',
      source: 'template',
    };
  }

  return {
    text: `${computed.period.label} 기준 ${goalAchievement.countedDays}일 기록이 있습니다. 통계 탭에서 자세히 확인해 보세요.`,
    source: 'template',
  };
}
