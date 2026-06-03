/** Stale 배너 문구 (coach / stats / ask / weekly report 공통) */
export function staleBannerMessage(
  isStale: boolean | undefined,
  staleHours: number | null | undefined,
): string | null {
  if (!isStale) return null;
  if (staleHours != null && staleHours > 0) {
    return `통계 집계가 ${staleHours}시간 지연될 수 있습니다.`;
  }
  return '데이터가 갱신 중일 수 있어요.';
}
