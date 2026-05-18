const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const ANCHOR_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;


export type StatsPeriodBounds = {
  anchor: string;
  from: Date;
  toExclusive: Date;
  label: string;
};

export function parseYmdParts(ymd: string): { y: number; m: number; d: number } {
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

/** KST calendar date `YYYY-MM-DD` at 00:00 → UTC instant */
export function kstMidnightUtc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d) - KST_OFFSET_MS);
}

export function todayAnchorKst(now = new Date()): string {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  return formatYmd(y, m, d);
}

export function formatYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parseAnchorDate(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const s = String(raw).trim();
  if (!ANCHOR_RE.test(s)) return null;
  try {
    parseYmdParts(s);
    return s;
  } catch {
    return null;
  }
}

export function addDaysYmd(ymd: string, days: number): string {
  const { y, m, d } = parseYmdParts(ymd);
  const base = kstMidnightUtc(y, m, d).getTime();
  return todayAnchorKst(new Date(base + days * 86_400_000));
}

function weekdaySun0(y: number, m: number, d: number): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function formatDayLabel(ymd: string): string {
  const { y, m, d } = parseYmdParts(ymd);
  const dow = weekdaySun0(y, m, d);
  return `${y}년 ${m}월 ${d}일 (${WEEKDAY_KO[dow]})`;
}

function formatShortMd(ymd: string): string {
  const { m, d } = parseYmdParts(ymd);
  return `${m}월 ${d}일`;
}

function mondayOfWeekYmd(anchorYmd: string): string {
  const { y, m, d } = parseYmdParts(anchorYmd);
  const dow = weekdaySun0(y, m, d);
  const daysFromMonday = (dow + 6) % 7;
  return addDaysYmd(anchorYmd, -daysFromMonday);
}

export function isPeriodInFuture(from: Date, todayYmd = todayAnchorKst()): boolean {
  const tomorrowYmd = addDaysYmd(todayYmd, 1);
  const tp = parseYmdParts(tomorrowYmd);
  const tomorrowStart = kstMidnightUtc(tp.y, tp.m, tp.d);
  return from.getTime() >= tomorrowStart.getTime();
}

export function boundsForRange(range: 'day' | 'week' | 'month', anchorYmd: string): StatsPeriodBounds {
  if (range === 'day') {
    const { y, m, d } = parseYmdParts(anchorYmd);
    const from = kstMidnightUtc(y, m, d);
    const next = addDaysYmd(anchorYmd, 1);
    const np = parseYmdParts(next);
    const toExclusive = kstMidnightUtc(np.y, np.m, np.d);
    return { anchor: anchorYmd, from, toExclusive, label: formatDayLabel(anchorYmd) };
  }

  if (range === 'week') {
    const monday = mondayOfWeekYmd(anchorYmd);
    const sunday = addDaysYmd(monday, 6);
    const mp = parseYmdParts(monday);
    const from = kstMidnightUtc(mp.y, mp.m, mp.d);
    const nextWeek = parseYmdParts(addDaysYmd(monday, 7));
    const toExclusive = kstMidnightUtc(nextWeek.y, nextWeek.m, nextWeek.d);
    return {
      anchor: anchorYmd,
      from,
      toExclusive,
      label: `${formatShortMd(monday)} – ${formatShortMd(sunday)}`,
    };
  }

  if (range === 'month') {
    const { y, m } = parseYmdParts(anchorYmd);
    const from = kstMidnightUtc(y, m, 1);
    const nextY = m === 12 ? y + 1 : y;
    const nextM = m === 12 ? 1 : m + 1;
    const toExclusive = kstMidnightUtc(nextY, nextM, 1);
    return { anchor: anchorYmd, from, toExclusive, label: `${y}년 ${m}월` };
  }

  throw new Error('bad_range');
}
