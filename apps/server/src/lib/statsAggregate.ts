import { prisma } from './prisma.js';
import { computeFulfillment, isGoalMet, type FulfillmentStatus } from './goalFulfillment.js';
import { addDaysYmd, todayAnchorKst, type StatsPeriodBounds } from './statsPeriod.js';

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

function enumerateKstDays(from: Date, toExclusive: Date): string[] {
  const days: string[] = [];
  let ymd = todayAnchorKst(from);
  const lastInstant = new Date(toExclusive.getTime() - 1);
  const endYmd = todayAnchorKst(lastInstant);
  while (ymd <= endYmd) {
    days.push(ymd);
    if (ymd === endYmd) break;
    ymd = addDaysYmd(ymd, 1);
  }
  return days;
}

type ProfileGoals = {
  goal: string | null;
  proteinGoalG: number | null;
  calorieGoalKcal: number | null;
  proteinGoalMinG: number | null;
  proteinGoalMaxG: number | null;
  calorieGoalMinKcal: number | null;
  calorieGoalMaxKcal: number | null;
};

export type StatsExtras = {
  byMealSlot: Record<string, NutritionSum>;
  daily: Array<{
    date: string;
    summary: NutritionSum;
    goalMet: { calorie: boolean; protein: boolean };
    calorieStatus: FulfillmentStatus;
    hasRecords: boolean;
  }>;
  periodMeta: { recordedDays: number; calendarDays: number };
  goalAchievement: {
    calorie: { metDays: number; countedDays: number; pct: number };
    protein: { metDays: number; countedDays: number; pct: number };
  };
};

export async function buildStatsExtras(
  userId: string,
  period: StatsPeriodBounds,
  profile: ProfileGoals | null,
  range: 'day' | 'week' | 'month',
): Promise<StatsExtras | null> {
  if (range === 'day') return null;

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
  const dailyMap = new Map<string, NutritionSum>();
  const dailyHasRecords = new Map<string, boolean>();

  for (const m of meals) {
    const slotKey = m.mealSlot ?? 'UNSPECIFIED';
    byMealSlot[slotKey] = addSum(byMealSlot[slotKey] ?? { ...ZERO }, m);

    const ymd = todayAnchorKst(m.consumedAt);
    dailyMap.set(ymd, addSum(dailyMap.get(ymd) ?? { ...ZERO }, m));
    dailyHasRecords.set(ymd, true);
  }

  const profileCtx = profile ? { goal: profile.goal } : null;
  const calorieGoal = profile?.calorieGoalKcal ?? null;
  const proteinGoal = profile?.proteinGoalG ?? null;
  const calorieBounds = profile
    ? { min: profile.calorieGoalMinKcal, max: profile.calorieGoalMaxKcal }
    : undefined;
  const proteinBounds = profile
    ? { min: profile.proteinGoalMinG, max: profile.proteinGoalMaxG }
    : undefined;

  const allDays = enumerateKstDays(period.from, period.toExclusive);
  let calorieMetDays = 0;
  let proteinMetDays = 0;
  let countedDays = 0;

  const daily = allDays.map((date) => {
    const summary = dailyMap.get(date) ?? { ...ZERO };
    const hasRecords = dailyHasRecords.get(date) === true;
    let calorieMet = false;
    let proteinMet = false;
    let calorieStatus: FulfillmentStatus = 'none';
    if (hasRecords) {
      countedDays += 1;
      if (calorieGoal != null) {
        const f = computeFulfillment('calorie', summary.calories, calorieGoal, profileCtx, calorieBounds);
        calorieStatus = f.status;
        calorieMet = f.status === 'met';
        if (calorieMet) calorieMetDays += 1;
      }
      if (proteinGoal != null) {
        proteinMet = isGoalMet('protein', summary.protein, proteinGoal, profileCtx, proteinBounds);
        if (proteinMet) proteinMetDays += 1;
      }
    }
    return { date, summary, goalMet: { calorie: calorieMet, protein: proteinMet }, calorieStatus, hasRecords };
  });

  const pct = (met: number, counted: number) => (counted > 0 ? Math.round((met / counted) * 100) : 0);

  return {
    byMealSlot,
    daily,
    periodMeta: { recordedDays: countedDays, calendarDays: allDays.length },
    goalAchievement: {
      calorie: { metDays: calorieMetDays, countedDays, pct: pct(calorieMetDays, countedDays) },
      protein: { metDays: proteinMetDays, countedDays, pct: pct(proteinMetDays, countedDays) },
    },
  };
}

/** day range에도 끼니별 합계 제공 */
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
