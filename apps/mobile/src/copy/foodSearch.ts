export const FOOD_SEARCH_COPY = {
  title: '음식 검색',
  entryCta: '음식 검색 · 언제·얼마나 먹었나',
  searchPlaceholder: '음식명을 검색하세요',
  searchA11yLabel: '음식명 검색',
  clearSearch: '검색어 지우기',

  rangeLabel: '기간',
  range30: '30일',
  range90: '90일',
  rangeAll: '전체',

  // 빈 검색어
  promptTitle: '음식명을 검색해 보세요',
  promptDesc: '언제, 얼마나 자주 먹었는지 확인할 수 있어요.',
  recentTitle: '최근 먹은 음식',

  // 빈도 카드
  frequency: (count: number) => `이 기간 동안 ${count}번 먹었어요`,
  lastConsumed: (label: string) => `마지막 섭취 · ${label}`,
  lastConsumedNone: '최근 섭취 기록이 없어요',
  slotDistributionPrefix: '주로 ',
  slotDistributionItem: (label: string, count: number) => `${label} ${count}번`,

  historyTitle: '섭취 이력',

  // 상태
  loadError: '검색에 실패했어요.',
  retry: '다시 시도',
  emptyResult: (q: string) => `이 기간에 "${q}" 기록이 없어요.`,
  emptyResultHint: '기간을 늘리거나 다른 이름으로 검색해 보세요.',
  suggestionsA11y: '검색 제안',

  // 이력 항목
  historyItemA11y: (date: string, slot: string, name: string) => `${date} ${slot} ${name}, 탭하면 해당 날짜로 이동`,
} as const;
