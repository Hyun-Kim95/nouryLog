import type { MealRow } from '../api/meals';
import { addDaysYmd, todayAnchorKst } from './statsPeriod';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

function parseYmdParts(ymd: string): { y: number; m: number; d: number } {
  const match = ymd.match(YMD_RE);
  if (!match) throw new Error('bad_ymd');
  const y = Number(match[1]);
  const mo = Number(match[2]);
  const d = Number(match[3]);
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) {
    throw new Error('bad_ymd');
  }
  return { y, m: mo, d };
}

/** KST calendar date at 00:00 → UTC instant (통계 버킷과 동일). */
function kstMidnightUtc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d) - KST_OFFSET_MS);
}

/** KST 해당일 12:00 — 과거 날짜 신규 기록 `consumedAt` 기본값. */
export function kstNoonIsoFromYmd(ymd: string): string {
  const { y, m, d } = parseYmdParts(ymd);
  return new Date(Date.UTC(y, m - 1, d, 3, 0, 0, 0)).toISOString();
}

/** 통계 `daily[].date`(KST YMD)와 동일한 하루 경계 — GET /meals `from`/`to`(lte)용. */
export function kstDayBoundsFromYmd(ymd: string): { from: string; to: string } {
  const { y, m, d } = parseYmdParts(ymd);
  const from = kstMidnightUtc(y, m, d);
  const next = parseYmdParts(addDaysYmd(ymd, 1));
  const toExclusive = kstMidnightUtc(next.y, next.m, next.d);
  const to = new Date(toExclusive.getTime() - 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

const YM_RE = /^(\d{4})-(\d{2})$/;

/** KST 월 전체 [from, to] — `GET /meals` 달력 dot용. */
export function kstMonthBoundsFromYm(ym: string): { from: string; to: string } {
  const match = ym.match(YM_RE);
  if (!match) throw new Error('bad_ym');
  const y = Number(match[1]);
  const mo = Number(match[2]);
  if (mo < 1 || mo > 12) throw new Error('bad_ym');
  const firstYmd = `${y}-${String(mo).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const lastYmd = `${y}-${String(mo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const { from } = kstDayBoundsFromYmd(firstYmd);
  const { to } = kstDayBoundsFromYmd(lastYmd);
  return { from, to };
}

/** `YYYY-MM` — YMD에서 추출. */
export function ymFromYmd(ymd: string): string {
  return ymd.slice(0, 7);
}

/** 식사 목록 → KST 기준 기록일 YMD 목록(중복 제거·정렬). */
export function mealDatesKstFromRows(meals: MealRow[]): string[] {
  const set = new Set<string>();
  for (const m of meals) {
    set.add(todayAnchorKst(new Date(m.consumedAt)));
  }
  return [...set].sort();
}

/** 차트 툴팁·식단 상세 제목용 (예: 5월 18일 (월)). */
export function formatKstDayTitle(ymd: string): string {
  const { y, m, d } = parseYmdParts(ymd);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const w = WEEKDAY_KO[dow];
  return w ? `${m}월 ${d}일 (${w})` : `${m}월 ${d}일`;
}

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
