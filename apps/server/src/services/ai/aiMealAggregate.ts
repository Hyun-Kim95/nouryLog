import { prisma } from '../../lib/prisma.js';
import {
  averageNutritionSum,
  countWindowRecordedDays,
  type NutritionSum,
} from '../../lib/statsAggregate.js';
import { effectiveMacroGoals, calculateRecommendationFull } from '../../lib/recommendation.js';
import { isGoalMet } from '../../lib/goalFulfillment.js';
import { buildEffectiveGoalsByDate, type GoalSnapshot } from '../../lib/weightEntry.js';
import { sundayOfWeekYmd, todayAnchorKst } from '../../lib/statsPeriod.js';
import {
  calendarDaysInPeriod,
  formatMealCitationLabel,
  formatStatPeriodCitationLabel,
  periodEndGoalDateYmd,
  resolveAiPeriodBounds,
  type AiPeriodKind,
} from './aiStatsPeriod.js';

export type AiComputed = {
  period: {
    anchor: string;
    from: string;
    toExclusive: string;
    label: string;
    timezone: 'Asia/Seoul';
    kind: AiPeriodKind;
  };
  summary: NutritionSum;
  goalComparison: {
    proteinGoalG: number;
    proteinAvgGapG: number;
    proteinMet: boolean;
    calorieGoalKcal: number;
    calorieMet: boolean;
  } | null;
  mealCount: number;
  aggregation: 'dailyAverage';
  periodMeta: { recordedDays: number; calendarDays: number };
};

export type AiMealCitation = {
  type: 'meal';
  mealId: string;
  date: string;
  foodName: string;
  mealSlot: string | null;
  nutrients: NutritionSum;
  label: string;
};

export type AiStatPeriodCitation = {
  type: 'stat_period';
  date: string;
  label: string;
  nutrients: NutritionSum;
};

export type AiAggregateResult = {
  computed: AiComputed;
  citations: Array<AiMealCitation | AiStatPeriodCitation>;
};

function roundSummary(sum: NutritionSum): NutritionSum {
  return {
    calories: Math.round(sum.calories * 10) / 10,
    protein: Math.round(sum.protein * 10) / 10,
    carbohydrate: Math.round(sum.carbohydrate * 10) / 10,
    fat: Math.round(sum.fat * 10) / 10,
  };
}

function profileToGoalSnapshot(profile: {
  goal: string | null;
  proteinGoalG: number | null;
  calorieGoalKcal: number | null;
  carbohydrateGoalG: number | null;
  fatGoalG: number | null;
  proteinGoalMinG: number | null;
  proteinGoalMaxG: number | null;
  calorieGoalMinKcal: number | null;
  calorieGoalMaxKcal: number | null;
  carbohydrateGoalMinG: number | null;
  carbohydrateGoalMaxG: number | null;
  fatGoalMinG: number | null;
  fatGoalMaxG: number | null;
}): GoalSnapshot {
  return { ...profile };
}

function buildGoalComparison(
  summary: NutritionSum,
  goals: GoalSnapshot | null,
  profileGoal: string | null | undefined,
): AiComputed['goalComparison'] {
  if (!goals?.proteinGoalG || !goals?.calorieGoalKcal) return null;
  const proteinMet = isGoalMet('protein', summary.protein, goals.proteinGoalG, { goal: profileGoal }, {
    min: goals.proteinGoalMinG,
    max: goals.proteinGoalMaxG,
  });
  const calorieMet = isGoalMet('calorie', summary.calories, goals.calorieGoalKcal, { goal: profileGoal }, {
    min: goals.calorieGoalMinKcal,
    max: goals.calorieGoalMaxKcal,
  });
  return {
    proteinGoalG: goals.proteinGoalG,
    proteinAvgGapG: Math.round((summary.protein - goals.proteinGoalG) * 10) / 10,
    proteinMet,
    calorieGoalKcal: goals.calorieGoalKcal,
    calorieMet,
  };
}

export async function aggregateMealsForAiPeriod(
  userId: string,
  kind: AiPeriodKind,
  anchorYmd: string,
): Promise<AiAggregateResult> {
  const period = resolveAiPeriodBounds(kind, anchorYmd);
  const meals = await prisma.meal.findMany({
    where: {
      userId,
      active: true,
      consumedAt: { gte: period.from, lt: period.toExclusive },
    },
    select: {
      id: true,
      name: true,
      consumedAt: true,
      calories: true,
      protein: true,
      carbohydrate: true,
      fat: true,
      mealSlot: true,
    },
    orderBy: { protein: 'desc' },
  });

  const mealYmds: string[] = [];
  let rawSum: NutritionSum = { calories: 0, protein: 0, carbohydrate: 0, fat: 0 };
  for (const m of meals) {
    mealYmds.push(todayAnchorKst(m.consumedAt));
    rawSum = {
      calories: rawSum.calories + m.calories,
      protein: rawSum.protein + m.protein,
      carbohydrate: rawSum.carbohydrate + m.carbohydrate,
      fat: rawSum.fat + m.fat,
    };
  }

  const recordedDays = countWindowRecordedDays(mealYmds);
  const summary =
    recordedDays > 0 ? roundSummary(averageNutritionSum(rawSum, recordedDays)) : roundSummary(rawSum);

  const profileRow = await prisma.profile.findUnique({ where: { userId } });
  const profile = profileRow ? profileToGoalSnapshot(profileRow) : null;
  const goalEndYmd = periodEndGoalDateYmd(kind, anchorYmd);
  const entriesAsc = await prisma.weightEntry.findMany({
    where: { userId, recordedAt: { lt: period.toExclusive } },
    orderBy: { recordedAt: 'asc' },
  });
  const effectiveMap = buildEffectiveGoalsByDate(entriesAsc, [goalEndYmd], profile);
  const periodGoals = effectiveMap.get(goalEndYmd) ?? profile;

  let goalsForCompare: GoalSnapshot | null = null;
  if (profileRow) {
    const full = calculateRecommendationFull({
      gender: (profileRow.gender as 'male' | 'female' | 'unspecified') ?? 'unspecified',
      age: profileRow.age,
      heightCm: profileRow.heightCm,
      weightKg: profileRow.weightKg,
      activityLevel: profileRow.activityLevel,
      goal: profileRow.goal,
    });
    const effective = effectiveMacroGoals(periodGoals ?? profileRow, full);
    goalsForCompare = {
      goal: periodGoals?.goal ?? profileRow.goal,
      proteinGoalG: effective.proteinGoalG,
      calorieGoalKcal: effective.calorieGoalKcal,
      carbohydrateGoalG: effective.carbohydrateGoalG,
      fatGoalG: effective.fatGoalG,
      proteinGoalMinG: periodGoals?.proteinGoalMinG ?? profileRow.proteinGoalMinG,
      proteinGoalMaxG: periodGoals?.proteinGoalMaxG ?? profileRow.proteinGoalMaxG,
      calorieGoalMinKcal: periodGoals?.calorieGoalMinKcal ?? profileRow.calorieGoalMinKcal,
      calorieGoalMaxKcal: periodGoals?.calorieGoalMaxKcal ?? profileRow.calorieGoalMaxKcal,
      carbohydrateGoalMinG: periodGoals?.carbohydrateGoalMinG ?? profileRow.carbohydrateGoalMinG,
      carbohydrateGoalMaxG: periodGoals?.carbohydrateGoalMaxG ?? profileRow.carbohydrateGoalMaxG,
      fatGoalMinG: periodGoals?.fatGoalMinG ?? profileRow.fatGoalMinG,
      fatGoalMaxG: periodGoals?.fatGoalMaxG ?? profileRow.fatGoalMaxG,
    };
  }

  const goalComparison = buildGoalComparison(summary, goalsForCompare, profile?.goal);

  const statCitation: AiStatPeriodCitation = {
    type: 'stat_period',
    date: kind === 'week_single' ? sundayOfWeekYmd(anchorYmd) : anchorYmd,
    label: formatStatPeriodCitationLabel(period, kind),
    nutrients: { ...summary },
  };

  const topMeals = [...meals]
    .sort((a, b) => b.protein - a.protein)
    .slice(0, 5)
    .map((m): AiMealCitation => {
      const date = todayAnchorKst(m.consumedAt);
      return {
        type: 'meal',
        mealId: m.id,
        date,
        foodName: m.name,
        mealSlot: m.mealSlot,
        nutrients: {
          calories: m.calories,
          protein: m.protein,
          carbohydrate: m.carbohydrate,
          fat: m.fat,
        },
        label: formatMealCitationLabel(date, m.mealSlot, m.name, m.protein),
      };
    });

  const citations: Array<AiMealCitation | AiStatPeriodCitation> =
    meals.length > 0 ? [statCitation, ...topMeals] : [];

  return {
    computed: {
      period: {
        anchor: period.anchor,
        from: period.from.toISOString(),
        toExclusive: period.toExclusive.toISOString(),
        label: period.label,
        timezone: 'Asia/Seoul',
        kind,
      },
      summary,
      goalComparison,
      mealCount: meals.length,
      aggregation: 'dailyAverage',
      periodMeta: {
        recordedDays,
        calendarDays: calendarDaysInPeriod(kind, anchorYmd),
      },
    },
    citations,
  };
}