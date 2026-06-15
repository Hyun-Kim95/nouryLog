const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const ANCHOR_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

export const STATS_WINDOW_SIZE = 6;

export type StatsPeriodBounds = {
  anchor: string;
  from: Date;
  toExclusive: Date;
  label: string;
};

export type StatsBucket = {
  /** 버킷 키: YYYY-MM-DD (일·주 일요일) 또는 YYYY-MM-01 (월) */
  date: string;
  label: string;
  from: Date;
  toExclusive: Date;
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

function formatDayLabel(ymd: string): string {
  const { y, m, d } = parseYmdParts(ymd);
  const dow = weekdaySun0(y, m, d);
  return `${y}년 ${m}월 ${d}일 (${WEEKDAY_KO[dow]})`;
}

function formatShortMd(ymd: string): string {
  const { m, d } = parseYmdParts(ymd);
  return `${m}월 ${d}일`;
}

function formatShortMdSlash(ymd: string): string {
  const { m, d } = parseYmdParts(ymd);
  return `${m}/${d}`;
}

/** 앵커가 속한 주의 일요일(주 시작) YMD */
export function sundayOfWeekYmd(anchorYmd: string): string {
  const { y, m, d } = parseYmdParts(anchorYmd);
  const dow = weekdaySun0(y, m, d);
  return addDaysYmd(anchorYmd, -dow);
}

/** 일요일이 속한 달 기준 N번째 일요일 → `4월 5주차` */
export function formatWeekLabelKst(sundayYmd: string): string {
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

export function bucketGoalDate(bucket: StatsBucket, range: 'day' | 'week' | 'month'): string {
  if (range === 'day') return bucket.date;
  if (range === 'week') return addDaysYmd(bucket.date, 6);
  const { y, m } = parseYmdParts(bucket.date);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return formatYmd(y, m, lastDay);
}

export function listStatsBuckets(range: 'day' | 'week' | 'month', anchorYmd: string): StatsBucket[] {
  if (range === 'day') {
    const startYmd = addDaysYmd(anchorYmd, -(STATS_WINDOW_SIZE - 1));
    const buckets: StatsBucket[] = [];
    let cursor = startYmd;
    for (let i = 0; i < STATS_WINDOW_SIZE; i++) {
      const { y, m, d } = parseYmdParts(cursor);
      const from = kstMidnightUtc(y, m, d);
      const np = parseYmdParts(addDaysYmd(cursor, 1));
      buckets.push({
        date: cursor,
        label: formatShortMdSlash(cursor),
        from,
        toExclusive: kstMidnightUtc(np.y, np.m, np.d),
      });
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
      const mp = parseYmdParts(cursor);
      const from = kstMidnightUtc(mp.y, mp.m, mp.d);
      const nextWeek = parseYmdParts(addDaysYmd(cursor, 7));
      buckets.push({
        date: cursor,
        label: formatWeekLabelKst(cursor),
        from,
        toExclusive: kstMidnightUtc(nextWeek.y, nextWeek.m, nextWeek.d),
      });
      cursor = addDaysYmd(cursor, 7);
    }
    return buckets;
  }

  if (range === 'month') {
    const anchorMonthStart = formatYmd(
      parseYmdParts(anchorYmd).y,
      parseYmdParts(anchorYmd).m,
      1,
    );
    const startMonthStart = addMonthsYmd(anchorMonthStart, -(STATS_WINDOW_SIZE - 1));
    const buckets: StatsBucket[] = [];
    let cursor = startMonthStart;
    for (let i = 0; i < STATS_WINDOW_SIZE; i++) {
      const { y, m } = parseYmdParts(cursor);
      const from = kstMidnightUtc(y, m, 1);
      const nextY = m === 12 ? y + 1 : y;
      const nextM = m === 12 ? 1 : m + 1;
      buckets.push({
        date: cursor,
        label: `${m}월`,
        from,
        toExclusive: kstMidnightUtc(nextY, nextM, 1),
      });
      cursor = formatYmd(nextY, nextM, 1);
    }
    return buckets;
  }

  throw new Error('bad_range');
}

function formatWindowLabel(
  range: 'day' | 'week' | 'month',
  buckets: StatsBucket[],
): string {
  const first = buckets[0]!;
  const last = buckets[buckets.length - 1]!;
  if (range === 'day') {
    return `${first.label} – ${last.label}`;
  }
  if (range === 'week') {
    return `${first.label} – ${last.label}`;
  }
  const y1 = parseYmdParts(first.date).y;
  const m1 = parseYmdParts(first.date).m;
  const y2 = parseYmdParts(last.date).y;
  const m2 = parseYmdParts(last.date).m;
  if (y1 === y2) return `${y1}년 ${m1}월 – ${m2}월`;
  return `${y1}년 ${m1}월 – ${y2}년 ${m2}월`;
}

/** 6버킷 롤링 윈도우(앵커 = 윈도우 끝) */
export function boundsForStatsWindow(
  range: 'day' | 'week' | 'month',
  anchorYmd: string,
): StatsPeriodBounds {
  const buckets = listStatsBuckets(range, anchorYmd);
  const first = buckets[0]!;
  const last = buckets[buckets.length - 1]!;
  return {
    anchor: anchorYmd,
    from: first.from,
    toExclusive: last.toExclusive,
    label: formatWindowLabel(range, buckets),
  };
}

export function isPeriodInFuture(from: Date, todayYmd = todayAnchorKst()): boolean {
  const tomorrowYmd = addDaysYmd(todayYmd, 1);
  const tp = parseYmdParts(tomorrowYmd);
  const tomorrowStart = kstMidnightUtc(tp.y, tp.m, tp.d);
  return from.getTime() >= tomorrowStart.getTime();
}

/** 인사이트 week_single: anchor 포함 과거 6일 = 최근 7일 (KST) */
export function boundsForRolling7Days(anchorYmd: string): StatsPeriodBounds {
  const windowStart = addDaysYmd(anchorYmd, -6);
  const sp = parseYmdParts(windowStart);
  const from = kstMidnightUtc(sp.y, sp.m, sp.d);
  const next = parseYmdParts(addDaysYmd(anchorYmd, 1));
  const toExclusive = kstMidnightUtc(next.y, next.m, next.d);
  return {
    anchor: anchorYmd,
    from,
    toExclusive,
    label: `${formatShortMd(windowStart)} – ${formatShortMd(anchorYmd)}`,
  };
}

/** @deprecated meal range 등 레거시 — 통계는 boundsForStatsWindow 사용 */
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
    const weekStart = sundayOfWeekYmd(anchorYmd);
    const saturday = addDaysYmd(weekStart, 6);
    const sp = parseYmdParts(weekStart);
    const from = kstMidnightUtc(sp.y, sp.m, sp.d);
    const nextWeek = parseYmdParts(addDaysYmd(weekStart, 7));
    const toExclusive = kstMidnightUtc(nextWeek.y, nextWeek.m, nextWeek.d);
    return {
      anchor: anchorYmd,
      from,
      toExclusive,
      label: `${formatShortMd(weekStart)} – ${formatShortMd(saturday)}`,
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
