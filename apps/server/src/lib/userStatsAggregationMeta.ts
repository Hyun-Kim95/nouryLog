/**
 * GET /stats 응답의 집계 시각·지연 메타.
 * 사용자 영양 합계는 Meal 행을 요청 시점에 live aggregate 하므로
 * 관리자 대시보드용 StatsBatch.lastRunAt 과 무관하다.
 */
export function userStatsAggregationMeta(now: Date) {
  return {
    aggregatedAt: now,
    isStale: false,
    staleHours: 0,
  };
}
