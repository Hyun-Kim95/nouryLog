import { formatKstDateTimeSeconds } from '../lib/dateRange';

export const STATS_COPY = {
  title: '통계',
  weightHistoryCta: '체중 추이',
  staleBanner: (hours: number) =>
    `최신 반영 지연 · 마지막 집계가 ${hours}시간 전이에요. 잠시 후 다시 확인해 주세요.`,
  aggregatedAt: (at: string, tz: string) => `${tz} · 집계 ${formatKstDateTimeSeconds(at)}`,
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
  rangeDay: '일별',
  rangeWeek: '주별',
  rangeMonth: '월별',
  periodPrev: '이전 기간',
  periodNext: '다음 기간',
  periodFutureBlocked: '아직 시작하지 않은 기간이에요.',
  bySlotTitle: '끼니별 합계',
  bySlotTitleAverage: '끼니별 일평균',
  slotLine: (label: string, kcal: number, proteinG: number, carbG: number, fatG: number) =>
    `${label} · ${kcal} kcal · 단백질 ${proteinG}g · 탄수 ${carbG}g · 지방 ${fatG}g`,
  calorieRangeChartTitle: '목표 구간 · 칼로리 · 단백질 · 탄수 · 지방',
  goalRangeLabel: (low: number, high: number, unit: string) => `${low}–${high}${unit}`,
  calorieChartTapHint: '막대를 탭하면 해당 날짜 합계가 표시돼요.',
  calorieChartTapHintWeekMonth: '달력에서 날짜를 선택하면 해당 구간으로 이동해요.',
  calendarOpen: '달력에서 기간 선택',
  calendarTitle: '날짜 선택',
  calendarClose: '닫기',
  calendarHint: '날짜를 탭하면 그 날짜가 포함된 통계 구간으로 이동해요.',
  calorieRangeLegend:
    '막대: 일별=해당일 합계, 주·월별=기록일 일평균. 연한 영역·점선=하루 목표 구간.',
  caloriePanelTitle: '칼로리',
  proteinPanelTitle: '단백질',
  carbPanelTitle: '탄수화물',
  fatPanelTitle: '지방',
  calorieStatusUnder: '목표 대비 부족',
  calorieStatusMet: '목표 구간 적정',
  calorieStatusOver: '목표 대비 초과',
  calorieStatusNone: '기록 없음',
  calorieTooltipMacros: (proteinG: number, carbG: number, fatG: number) =>
    `단백질 ${proteinG}g · 탄수 ${carbG}g · 지방 ${fatG}g`,
  macroBarA11y: (
    day: number,
    kcal: number,
    proteinG: number,
    carbG: number,
    fatG: number,
  ) =>
    `${day}일, 칼로리 ${kcal} 킬로칼로리, 단백질 ${proteinG}그램, 탄수 ${carbG}그램, 지방 ${fatG}그램`,
} as const;
