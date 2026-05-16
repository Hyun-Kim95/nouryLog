const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const ANCHOR_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type StatsRange = 'day' | 'week' | 'month';

function parseYmdParts(ymd: string): { y: number; m: number; d: number } {
  const m = ymd.match(ANCHOR_RE);
  if (!m) throw new Error('bad_anchor');
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) {
    throw new Error('bad_anchor');
  }
  return { y, m: mo, d };
}

function formatYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function todayAnchorKst(now = new Date()): string {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  return formatYmd(kst.getUTCFullYear(), kst.getUTCMonth() + 1, kst.getUTCDate());
}

export function addDaysYmd(ymd: string, days: number): string {
  const { y, m, d } = parseYmdParts(ymd);
  const base = new Date(Date.UTC(y, m - 1, d) - KST_OFFSET_MS).getTime();
  return todayAnchorKst(new Date(base + days * 86_400_000));
}

function addMonthsYmd(ymd: string, months: number): string {
  const { y, m, d } = parseYmdParts(ymd);
  let month = m + months;
  let year = y;
  while (month < 1) {
    month += 12;
    year -= 1;
  }
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return formatYmd(year, month, Math.min(d, lastDay));
}

/** offset 0 = 오늘이 포함된 현재 기간, -1 = 이전 일/주/월 */
export function shiftAnchor(todayYmd: string, range: StatsRange, periodOffset: number): string {
  if (periodOffset === 0) return todayYmd;
  if (range === 'day') return addDaysYmd(todayYmd, periodOffset);
  if (range === 'week') return addDaysYmd(todayYmd, periodOffset * 7);
  return addMonthsYmd(todayYmd, periodOffset);
}
