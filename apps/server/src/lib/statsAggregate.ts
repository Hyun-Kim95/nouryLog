import { prisma } from './prisma.js';
import { computeFulfillment, isGoalMet, type FulfillmentStatus } from './goalFulfillment.js';
import {
  STATS_WINDOW_SIZE,
  bucketGoalDate,
  listStatsBuckets,
  todayAnchorKst,
  type StatsBucket,
  type StatsPeriodBounds,
} from './statsPeriod.js';
import { buildEffectiveGoalsByDate, type GoalSnapshot } from './weightEntry.js';

export type NutritionSum = {
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
};

const ZERO: NutritionSum = { calories: 0, protein: 0, carbohydrate: 0, fat: 0 };

function addSum(a: NutritionSum, b: Partial<NutritionSum>): NutritionSum {
  return {
    calories: a.calories + Number(b.calories ?? 0),
    protein: a.protein + Number(b.protein ?? 0),
    carbohydrate: a.carbohydrate + Number(b.carbohydrate ?? 0),
    fat: a.fat + Number(b.fat ?? 0),
  };
}

export function divideNutritionSum(sum: NutritionSum, divisor: number): NutritionSum {
  if (divisor <= 0) return { ...ZERO };
  return {
    calories: sum.calories / divisor,
    protein: sum.protein / divisor,
    carbohydrate: sum.carbohydrate / divisor,
    fat: sum.fat / divisor,
  };
}

function roundNutritionSum(sum: NutritionSum): NutritionSum {
  return {
    calories: Math.round(sum.calories * 10) / 10,
    protein: Math.round(sum.protein * 10) / 10,
    carbohydrate: Math.round(sum.carbohydrate * 10) / 10,
    fat: Math.round(sum.fat * 10) / 10,
  };
}

export function averageNutritionSum(sum: NutritionSum, recordedDays: number): NutritionSum {
  return roundNutritionSum(divideNutritionSum(sum, recordedDays));
}

/** 차트 `daily[].summary`: 일=합계, 주·월=버킷 내 기록일 일평균 */
export function bucketChartSummary(
  range: 'day' | 'week' | 'month',
  bucketSum: NutritionSum,
  recordedDaysInBucket: number,
): NutritionSum {
  if (recordedDaysInBucket <= 0) return { ...ZERO };
  if (range === 'day') return bucketSum;
  return averageNutritionSum(bucketSum, recordedDaysInBucket);
}

export function averageByMealSlot(
  slots: Record<string, NutritionSum>,
  recordedDays: number,
): Record<string, NutritionSum> {
  const out: Record<string, NutritionSum> = {};
  for (const [key, sum] of Object.entries(slots)) {
    out[key] = averageNutritionSum(sum, recordedDays);
  }
  return out;
}

type ProfileGoals = GoalSnapshot;

function profileToSnapshot(profile: ProfileGoals | null): GoalSnapshot | null {
  if (!profile) return null;
  return { ...profile };
}

function findBucketForInstant(buckets: StatsBucket[], instant: Date): string | null {
  const t = instant.getTime();
  for (const b of buckets) {
    if (t >= b.from.getTime() && t < b.toExclusive.getTime()) {
      return b.date;
    }
  }
  return null;
}

export type StatsSeriesPoint = {
  date: string;
  label: string;
  summary: NutritionSum;
  goalMet: { calorie: boolean; protein: boolean };
  calorieStatus: FulfillmentStatus;
  hasRecords: boolean;
};

export type StatsExtras = {
  byMealSlot: Record<string, NutritionSum>;
  daily: StatsSeriesPoint[];
  periodMeta: { recordedDays: number; calendarDays: number };
  goalAchievement: {
    calorie: { metDays: number; countedDays: number; pct: number };
    protein: { metDays: number; countedDays: number; pct: number };
  };
};

export async function buildStatsSeries(
  userId: string,
  period: StatsPeriodBounds,
  profile: ProfileGoals | null,
  range: 'day' | 'week' | 'month',
): Promise<StatsExtras> {
  const buckets = listStatsBuckets(range, period.anchor);

  const meals = await prisma.meal.findMany({
    where: {
      userId,
      active: true,
      consumedAt: { gte: period.from, lt: period.toExclusive },
    },
    select: {
      consumedAt: true,
      calories: true,
      protein: true,
      carbohydrate: true,
      fat: true,
      mealSlot: true,
    },
  });

  const byMealSlot: Record<string, NutritionSum> = {};
  const bucketSums = new Map<string, NutritionSum>();
  const bucketHasRecords = new Map<string, boolean>();
  const bucketRecordedDays = new Map<string, Set<string>>();

  for (const b of buckets) {
    bucketSums.set(b.date, { ...ZERO });
    bucketHasRecords.set(b.date, false);
    bucketRecordedDays.set(b.date, new Set());
  }

  for (const m of meals) {
    const slotKey = m.mealSlot ?? 'UNSPECIFIED';
    byMealSlot[slotKey] = addSum(byMealSlot[slotKey] ?? { ...ZERO }, m);

    const bucketKey = findBucketForInstant(buckets, m.consumedAt);
    if (!bucketKey) continue;
    bucketSums.set(bucketKey, addSum(bucketSums.get(bucketKey) ?? { ...ZERO }, m));
    bucketHasRecords.set(bucketKey, true);
    bucketRecordedDays.get(bucketKey)!.add(todayAnchorKst(m.consumedAt));
  }

  const bucketSummary = (bucketDate: string): NutritionSum => {
    const raw = bucketSums.get(bucketDate) ?? { ...ZERO };
    const days = bucketRecordedDays.get(bucketDate)?.size ?? 0;
    return bucketChartSummary(range, raw, days);
  };

  const goalDates = buckets.map((b) => bucketGoalDate(b, range));

  const entriesAsc = await prisma.weightEntry.findMany({
    where: { userId, recordedAt: { lt: period.toExclusive } },
    orderBy: { recordedAt: 'asc' },
  });
  const effectiveByDate = buildEffectiveGoalsByDate(
    entriesAsc,
    goalDates,
    profileToSnapshot(profile),
  );

  let calorieMetBuckets = 0;
  let proteinMetBuckets = 0;
  let countedBuckets = 0;

  const daily: StatsSeriesPoint[] = buckets.map((b) => {
    const summary = bucketSummary(b.date);
    const hasRecords = bucketHasRecords.get(b.date) === true;
    const goalDate = bucketGoalDate(b, range);
    const goals = effectiveByDate.get(goalDate) ?? null;
    const profileCtx = goals ? { goal: goals.goal } : null;
    const calorieGoal = goals?.calorieGoalKcal ?? null;
    const proteinGoal = goals?.proteinGoalG ?? null;
    const calorieBounds = goals
      ? { min: goals.calorieGoalMinKcal, max: goals.calorieGoalMaxKcal }
      : undefined;
    const proteinBounds = goals
      ? { min: goals.proteinGoalMinG, max: goals.proteinGoalMaxG }
      : undefined;

    let calorieMet = false;
    let proteinMet = false;
    let calorieStatus: FulfillmentStatus = 'none';
    if (hasRecords) {
      countedBuckets += 1;
      if (calorieGoal != null) {
        const f = computeFulfillment('calorie', summary.calories, calorieGoal, profileCtx, calorieBounds);
        calorieStatus = f.status;
        calorieMet = f.status === 'met';
        if (calorieMet) calorieMetBuckets += 1;
      }
      if (proteinGoal != null) {
        proteinMet = isGoalMet('protein', summary.protein, proteinGoal, profileCtx, proteinBounds);
        if (proteinMet) proteinMetBuckets += 1;
      }
    }
    return {
      date: b.date,
      label: b.label,
      summary,
      goalMet: { calorie: calorieMet, protein: proteinMet },
      calorieStatus,
      hasRecords,
    };
  });

  const pct = (met: number, counted: number) => (counted > 0 ? Math.round((met / counted) * 100) : 0);

  return {
    byMealSlot,
    daily,
    periodMeta: { recordedDays: countedBuckets, calendarDays: STATS_WINDOW_SIZE },
    goalAchievement: {
      calorie: {
        metDays: calorieMetBuckets,
        countedDays: countedBuckets,
        pct: pct(calorieMetBuckets, countedBuckets),
      },
      protein: {
        metDays: proteinMetBuckets,
        countedDays: countedBuckets,
        pct: pct(proteinMetBuckets, countedBuckets),
      },
    },
  };
}

/** @deprecated buildStatsSeries 사용 */
export const buildStatsExtras = buildStatsSeries;

/** 끼니별 합계(윈도우 전체) */
export async function buildByMealSlotForPeriod(
  userId: string,
  period: StatsPeriodBounds,
): Promise<Record<string, NutritionSum>> {
  const meals = await prisma.meal.findMany({
    where: {
      userId,
      active: true,
      consumedAt: { gte: period.from, lt: period.toExclusive },
    },
    select: {
      calories: true,
      protein: true,
      carbohydrate: true,
      fat: true,
      mealSlot: true,
    },
  });
  const byMealSlot: Record<string, NutritionSum> = {};
  for (const m of meals) {
    const slotKey = m.mealSlot ?? 'UNSPECIFIED';
    byMealSlot[slotKey] = addSum(byMealSlot[slotKey] ?? { ...ZERO }, m);
  }
  return byMealSlot;
}
