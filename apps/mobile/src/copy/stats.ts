export const STATS_COPY = {
  title: '통계',
  staleBanner: (hours: number) =>
    `최신 반영 지연 · 마지막 집계가 ${hours}시간 전이에요. 잠시 후 다시 확인해 주세요.`,
  aggregatedAt: (at: string, tz: string) => `${tz} · 집계 ${at}`,
  summaryTitle: '영양 합계',
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
} as const;
