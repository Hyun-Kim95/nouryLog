const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const ANCHOR_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type StatsRange = 'day' | 'week' | 'month';

export type StatsBucket = {
  date: string;
  label: string;
};

export const STATS_WINDOW_SIZE = 6;

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

function weekdaySun0(y: number, m: number, d: number): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function formatShortMdSlash(ymd: string): string {
  const { m, d } = parseYmdParts(ymd);
  return `${m}/${d}`;
}

export function sundayOfWeekYmd(anchorYmd: string): string {
  const { y, m, d } = parseYmdParts(anchorYmd);
  const dow = weekdaySun0(y, m, d);
  return addDaysYmd(anchorYmd, -dow);
}

function formatWeekLabelKst(sundayYmd: string): string {
  const { y, m, d } = parseYmdParts(sundayYmd);
  if (weekdaySun0(y, m, d) !== 0) {
    throw new Error('not_sunday');
  }
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  let weekIndex = 0;
  for (let day = 1; day <= lastDay; day++) {
    if (weekdaySun0(y, m, day) === 0) {
      weekIndex += 1;
      const ymd = formatYmd(y, m, day);
      if (ymd === sundayYmd) {
        return `${m}월 ${weekIndex}주차`;
      }
    }
  }
  return `${m}월 ${weekIndex || 1}주차`;
}

/** 서버 statsPeriod.listStatsBuckets 와 동일 버킷 키·라벨 (경계는 YMD 비교용). */
export function listStatsBuckets(range: StatsRange, anchorYmd: string): StatsBucket[] {
  if (range === 'day') {
    const startYmd = addDaysYmd(anchorYmd, -(STATS_WINDOW_SIZE - 1));
    const buckets: StatsBucket[] = [];
    let cursor = startYmd;
    for (let i = 0; i < STATS_WINDOW_SIZE; i++) {
      buckets.push({ date: cursor, label: formatShortMdSlash(cursor) });
      cursor = addDaysYmd(cursor, 1);
    }
    return buckets;
  }

  if (range === 'week') {
    const endSunday = sundayOfWeekYmd(anchorYmd);
    const startSunday = addDaysYmd(endSunday, -(STATS_WINDOW_SIZE - 1) * 7);
    const buckets: StatsBucket[] = [];
    let cursor = startSunday;
    for (let i = 0; i < STATS_WINDOW_SIZE; i++) {
      buckets.push({ date: cursor, label: formatWeekLabelKst(cursor) });
      cursor = addDaysYmd(cursor, 7);
    }
    return buckets;
  }

  if (range === 'month') {
    const anchorMonthStart = formatYmd(parseYmdParts(anchorYmd).y, parseYmdParts(anchorYmd).m, 1);
    const startMonthStart = addMonthsYmd(anchorMonthStart, -(STATS_WINDOW_SIZE - 1));
    const buckets: StatsBucket[] = [];
    let cursor = startMonthStart;
    for (let i = 0; i < STATS_WINDOW_SIZE; i++) {
      const { y, m } = parseYmdParts(cursor);
      buckets.push({ date: cursor, label: `${m}월` });
      const nextY = m === 12 ? y + 1 : y;
      const nextM = m === 12 ? 1 : m + 1;
      cursor = formatYmd(nextY, nextM, 1);
    }
    return buckets;
  }

  throw new Error('bad_range');
}

function bucketContainsYmd(bucket: StatsBucket, pickedYmd: string, range: StatsRange): boolean {
  if (range === 'day') return bucket.date === pickedYmd;
  if (range === 'week') {
    const weekEnd = addDaysYmd(bucket.date, 6);
    return pickedYmd >= bucket.date && pickedYmd <= weekEnd;
  }
  return pickedYmd.slice(0, 7) === bucket.date.slice(0, 7);
}

function windowContainsYmd(range: StatsRange, anchorYmd: string, pickedYmd: string): boolean {
  const buckets = listStatsBuckets(range, anchorYmd);
  return buckets.some((b) => bucketContainsYmd(b, pickedYmd, range));
}

/** 선택한 KST 날짜가 포함된 6버킷 윈도우의 periodOffset (0=현재 블록). */
export function periodOffsetForKstDate(
  range: StatsRange,
  pickedYmd: string,
  todayYmd = todayAnchorKst(),
): number {
  if (pickedYmd > todayYmd) return 0;
  const maxScan = 400;
  for (let offset = 0; offset >= -maxScan; offset--) {
    const anchor = shiftAnchor(todayYmd, range, offset);
    if (windowContainsYmd(range, anchor, pickedYmd)) return offset;
  }
  return -maxScan;
}

/** offset 0 = 현재 6버킷 윈도우(끝=오늘), -1 = 이전 6일/6주/6월 블록 */
export function shiftAnchor(todayYmd: string, range: StatsRange, periodOffset: number): string {
  if (periodOffset === 0) return todayYmd;
  const step = STATS_WINDOW_SIZE;
  if (range === 'day') return addDaysYmd(todayYmd, periodOffset * step);
  if (range === 'week') return addDaysYmd(todayYmd, periodOffset * step * 7);
  return addMonthsYmd(todayYmd, periodOffset * step);
}
