import type { WeightEntry } from '@prisma/client';
import { addDaysYmd, kstMidnightUtc, parseYmdParts, todayAnchorKst } from './statsPeriod.js';

export const WEIGHT_CHECKIN_INTERVAL_DAYS = 7;

export type GoalSnapshot = {
  goal: string | null;
  proteinGoalG: number | null;
  calorieGoalKcal: number | null;
  proteinGoalMinG: number | null;
  proteinGoalMaxG: number | null;
  calorieGoalMinKcal: number | null;
  calorieGoalMaxKcal: number | null;
};

export function snapshotFromWeightEntry(entry: WeightEntry): GoalSnapshot {
  return {
    goal: entry.goal,
    proteinGoalG: entry.proteinGoalG,
    calorieGoalKcal: entry.calorieGoalKcal,
    proteinGoalMinG: entry.proteinGoalMinG,
    proteinGoalMaxG: entry.proteinGoalMaxG,
    calorieGoalMinKcal: entry.calorieGoalMinKcal,
    calorieGoalMaxKcal: entry.calorieGoalMaxKcal,
  };
}

/** KST `YYYY-MM-DD` 23:59:59.999 as UTC instant */
export function kstEndOfDayUtc(ymd: string): Date {
  const next = addDaysYmd(ymd, 1);
  const { y, m, d } = parseYmdParts(next);
  return new Date(kstMidnightUtc(y, m, d).getTime() - 1);
}

export function buildEffectiveGoalsByDate(
  entriesAsc: WeightEntry[],
  dates: string[],
  fallback: GoalSnapshot | null,
): Map<string, GoalSnapshot | null> {
  const out = new Map<string, GoalSnapshot | null>();
  let idx = 0;
  let current: GoalSnapshot | null = null;

  for (const date of dates) {
    const end = kstEndOfDayUtc(date).getTime();
    while (idx < entriesAsc.length && entriesAsc[idx]!.recordedAt.getTime() <= end) {
      current = snapshotFromWeightEntry(entriesAsc[idx]!);
      idx += 1;
    }
    out.set(date, current ?? fallback);
  }
  return out;
}

export function daysSinceRecordedAt(recordedAt: Date, now = new Date()): number {
  const ms = now.getTime() - recordedAt.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

export function isWeightCheckInDue(lastRecordedAt: Date | null, now = new Date()): boolean {
  if (!lastRecordedAt) return true;
  return daysSinceRecordedAt(lastRecordedAt, now) >= WEIGHT_CHECKIN_INTERVAL_DAYS;
}

/** KST calendar day bounds for `recordedAt` filtering [start, end). */
export function kstDayBoundsForInstant(at: Date): { ymd: string; start: Date; endExclusive: Date } {
  const ymd = todayAnchorKst(at);
  const { y, m, d } = parseYmdParts(ymd);
  const start = kstMidnightUtc(y, m, d);
  const next = addDaysYmd(ymd, 1);
  const { y: ny, m: nm, d: nd } = parseYmdParts(next);
  const endExclusive = kstMidnightUtc(ny, nm, nd);
  return { ymd, start, endExclusive };
}
