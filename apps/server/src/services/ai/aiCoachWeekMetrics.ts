import { prisma } from '../../lib/prisma.js';
import { isGoalMet } from '../../lib/goalFulfillment.js';
import type { NutritionSum } from '../../lib/statsAggregate.js';
import { addDaysYmd } from '../../lib/statsPeriod.js';
import { aggregateMealsForAiPeriod } from './aiMealAggregate.js';

export type MacroBreakdown = {
  proteinPct: number;
  carbPct: number;
  fatPct: number;
};

export type WeekGoalAchievement = {
  proteinMetDays: number;
  calorieMetDays: number;
  countedDays: number;
  proteinShortDays: number;
  calorieShortDays: number;
};

export function computeMacroBreakdown(summary: NutritionSum): MacroBreakdown {
  const totalKcal = summary.calories + summary.carbohydrate * 4 + summary.protein * 4 + summary.fat * 9;
  const proteinPct = totalKcal > 0 ? Math.round(((summary.protein * 4) / totalKcal) * 100) : 0;
  const carbPct = totalKcal > 0 ? Math.round(((summary.carbohydrate * 4) / totalKcal) * 100) : 0;
  const fatPct = Math.max(0, 100 - proteinPct - carbPct);
  return { proteinPct, carbPct, fatPct };
}

export async function computeWeekGoalAchievement(
  userId: string,
  anchorYmd: string,
): Promise<WeekGoalAchievement> {
  let proteinMetDays = 0;
  let calorieMetDays = 0;
  let proteinShortDays = 0;
  let calorieShortDays = 0;
  let countedDays = 0;

  const windowStart = addDaysYmd(anchorYmd, -6);
  const profileRow = await prisma.profile.findUnique({ where: { userId } });

  for (let i = 0; i < 7; i++) {
    const dayYmd = addDaysYmd(windowStart, i);
    const dayAgg = await aggregateMealsForAiPeriod(userId, 'day_single', dayYmd);
    if (dayAgg.computed.mealCount === 0) continue;

    countedDays += 1;
    const daySummary = dayAgg.computed.summary;
    const gc = dayAgg.computed.goalComparison;

    const proteinMet =
      gc?.proteinGoalG != null &&
      isGoalMet('protein', daySummary.protein, gc.proteinGoalG, { goal: profileRow?.goal });
    const calorieMet =
      gc?.calorieGoalKcal != null &&
      isGoalMet('calorie', daySummary.calories, gc.calorieGoalKcal, { goal: profileRow?.goal });

    if (proteinMet) proteinMetDays += 1;
    else if (gc?.proteinGoalG) proteinShortDays += 1;

    if (calorieMet) calorieMetDays += 1;
    else if (gc?.calorieGoalKcal) calorieShortDays += 1;
  }

  return {
    proteinMetDays,
    calorieMetDays,
    countedDays,
    proteinShortDays,
    calorieShortDays,
  };
}
