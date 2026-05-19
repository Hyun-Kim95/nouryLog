export const STATS_COPY = {
  title: '통계',
  weightHistoryCta: '체중 추이',
  staleBanner: (hours: number) =>
    `최신 반영 지연 · 마지막 집계가 ${hours}시간 전이에요. 잠시 후 다시 확인해 주세요.`,
  aggregatedAt: (at: string, tz: string) => `${tz} · 집계 ${at}`,
  summaryTitle: '영양 합계',
  summaryTitleAverage: (days: number) => `일평균 (기록 ${days}일)`,
  fulfillmentTitle: '목표 대비',
  proteinFulfillment: (pct: number, current: number, goal: number) =>
    `단백질 ${pct}% (${current}/${goal}g)`,
  calorieFulfillment: (pct: number, current: number, goal: number) =>
    `칼로리 ${pct}% (${current}/${goal} kcal)`,
  empty: '이 기간에 기록이 없어요.',
  emptyCta: '기록 탭에서 식사를 추가해 보세요.',
  loadError: '통계를 불러오지 못했어요.',
  retry: '다시 시도',
  rangeDay: '하루',
  rangeWeek: '주',
  rangeMonth: '월',
  periodPrev: '이전 기간',
  periodNext: '다음 기간',
  periodFutureBlocked: '아직 시작하지 않은 기간이에요.',
  bySlotTitle: '끼니별 합계',
  bySlotTitleAverage: '끼니별 일평균',
  slotLine: (label: string, kcal: number, proteinG: number) => `${label} · ${kcal} kcal · 단백질 ${proteinG}g`,
  calorieRangeChartTitle: '일별 칼로리 · 단백질 · 목표 구간',
  calorieChartTapHint: '막대를 탭하면 해당 날짜 상세가 표시돼요.',
  calorieRangeLegend:
    '위·아래 패널: 칼로리(kcal)·단백질(g) 각각 목표 구간·막대. 연한 영역·점선=목표 구간.',
  caloriePanelTitle: '칼로리',
  proteinPanelTitle: '단백질',
  calorieTooltipProtein: (proteinG: number) => `단백질 ${proteinG}g`,
  calorieStatusUnder: '목표 대비 부족',
  calorieStatusMet: '목표 구간 적정',
  calorieStatusOver: '목표 대비 초과',
  calorieStatusNone: '기록 없음',
  calorieTooltipMacros: (proteinG: number, carbG: number, fatG: number) =>
    `단백질 ${proteinG}g · 탄수 ${carbG}g · 지방 ${fatG}g`,
  calorieBarA11y: (day: number, kcal: number, proteinG: number) =>
    `${day}일, 칼로리 ${kcal} 킬로칼로리, 단백질 ${proteinG}그램`,
} as const;
