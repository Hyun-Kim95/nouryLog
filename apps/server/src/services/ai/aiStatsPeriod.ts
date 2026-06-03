import {
  addDaysYmd,
  boundsForRange,
  isPeriodInFuture,
  parseAnchorDate,
  parseYmdParts,
  sundayOfWeekYmd,
  todayAnchorKst,
  type StatsPeriodBounds,
} from '../../lib/statsPeriod.js';

export type AiPeriodKind = 'day_single' | 'week_single' | 'month_single';

const KIND_TO_RANGE = {
  day_single: 'day',
  week_single: 'week',
  month_single: 'month',
} as const satisfies Record<AiPeriodKind, 'day' | 'week' | 'month'>;

export function resolveAiPeriodBounds(
  kind: AiPeriodKind,
  anchorYmd: string,
): StatsPeriodBounds & { kind: AiPeriodKind; timezone: 'Asia/Seoul' } {
  const range = KIND_TO_RANGE[kind];
  const period = boundsForRange(range, anchorYmd);
  return { ...period, kind, timezone: 'Asia/Seoul' };
}

export function parseAiAnchor(raw: unknown): { anchor: string; error?: string } {
  const anchor = parseAnchorDate(raw) ?? todayAnchorKst();
  const dayBounds = boundsForRange('day', anchor);
  if (isPeriodInFuture(dayBounds.from)) {
    return { anchor, error: 'future_anchor' };
  }
  return { anchor };
}

/** Period end date (KST YMD) for goal snapshot — stats v1.8 규칙 */
export function periodEndGoalDateYmd(kind: AiPeriodKind, anchorYmd: string): string {
  if (kind === 'day_single') return anchorYmd;
  if (kind === 'week_single') return addDaysYmd(sundayOfWeekYmd(anchorYmd), 6);
  const parts = anchorYmd.match(/^(\d{4})-(\d{2})/);
  if (!parts) return anchorYmd;
  const y = Number(parts[1]);
  const m = Number(parts[2]);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${parts[1]}-${parts[2]}-${String(lastDay).padStart(2, '0')}`;
}

export function calendarDaysInPeriod(kind: AiPeriodKind, anchorYmd: string): number {
  if (kind === 'day_single') return 1;
  if (kind === 'week_single') return 7;
  const { y, m } = (() => {
    const p = anchorYmd.match(/^(\d{4})-(\d{2})/);
    return { y: Number(p?.[1]), m: Number(p?.[2]) };
  })();
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function formatStatPeriodCitationLabel(period: StatsPeriodBounds, kind: AiPeriodKind): string {
  if (kind === 'day_single') return `${period.label} 집계`;
  return `${period.label} 주간 집계`;
}

export function formatMealSlotKo(slot: string | null): string {
  const map: Record<string, string> = {
    BREAKFAST: '아침',
    LUNCH: '점심',
    DINNER: '저녁',
    SNACK: '간식',
  };
  return slot ? (map[slot] ?? slot) : '';
}

function formatShortMdLocal(ymd: string): string {
  const { m, d } = parseYmdParts(ymd);
  return `${m}월 ${d}일`;
}

export function formatMealCitationLabel(
  dateYmd: string,
  mealSlot: string | null,
  foodName: string,
  protein: number,
): string {
  const md = formatShortMdLocal(dateYmd);
  const slot = formatMealSlotKo(mealSlot);
  const slotPart = slot ? ` ${slot}` : '';
  return `${md}${slotPart} — ${foodName} (단백질 ${Math.round(protein)}g)`;
}
