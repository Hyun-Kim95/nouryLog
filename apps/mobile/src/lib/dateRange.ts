/** 로컬 타임존 기준 당일 [from, to] ISO 범위 (홈 집계·GET /meals 필터용). */
export function localDayBounds(date = new Date()): { from: string; to: string } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}
