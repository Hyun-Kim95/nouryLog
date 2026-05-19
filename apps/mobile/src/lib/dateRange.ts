/** 로컬 타임존 기준 당일 [from, to] ISO 범위 (홈 집계·GET /meals 필터용). */
export function localDayBounds(date = new Date()): { from: string; to: string } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

/** 오늘 00:00 직전 시각 — `GET /meals?to=` 로 당일 이전 기록만 조회할 때 사용 */
export function localDayStartExclusiveUpperBound(date = new Date()): string {
  const { from } = localDayBounds(date);
  return new Date(new Date(from).getTime() - 1).toISOString();
}
