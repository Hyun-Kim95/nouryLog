import { prisma } from '../../lib/prisma.js';
import { addDaysYmd, todayAnchorKst } from '../../lib/statsPeriod.js';
import type { AiPeriodKind } from './aiStatsPeriod.js';
import { resolveAiPeriodBounds } from './aiStatsPeriod.js';
import type { AiAggregateResult } from './aiMealAggregate.js';

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

export type PeriodKeyMetrics = {
  breakfastSkipDays: number;
  proteinShortMeals: number;
};

export type PatternItem = { id: string; title: string; detail: string };

export type EvidenceItem = {
  date: string;
  slot: string;
  foodName: string;
  mealId?: string;
};

export type PeriodComparison = {
  recordedDaysDelta: number;
  previousLabel: string;
};

export type MealPatternAnalysis = {
  keyMetrics: PeriodKeyMetrics;
  patterns: PatternItem[];
  evidence: EvidenceItem[];
  nextGoals: string[];
  frequentFoods: Array<{ name: string; count: number }>;
  breakfastSkipByWeekday?: Array<{ weekday: string; skipDays: number }>;
  comparison?: PeriodComparison;
};

type MealRow = {
  id: string;
  name: string;
  consumedAt: Date;
  calories: number;
  protein: number;
  mealSlot: string | null;
};

function weekdayIndexKst(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function shiftMonthAnchorYmd(anchorYmd: string, months: number): string {
  const m = anchorYmd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return anchorYmd;
  let year = Number(m[1]);
  let month = Number(m[2]);
  const day = Number(m[3]);
  month += months;
  while (month < 1) {
    month += 12;
    year -= 1;
  }
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const d = Math.min(day, lastDay);
  return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function previousPeriodAnchor(kind: AiPeriodKind, anchorYmd: string): string {
  if (kind === 'week_single') return addDaysYmd(anchorYmd, -7);
  return shiftMonthAnchorYmd(anchorYmd, -1);
}

async function fetchMealsInPeriod(userId: string, kind: AiPeriodKind, anchorYmd: string): Promise<MealRow[]> {
  const period = resolveAiPeriodBounds(kind, anchorYmd);
  return prisma.meal.findMany({
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
      mealSlot: true,
    },
    orderBy: { consumedAt: 'asc' },
  });
}

function slotLabel(slot: string | null): string {
  if (slot === 'BREAKFAST') return '아침';
  if (slot === 'LUNCH') return '점심';
  if (slot === 'DINNER') return '저녁';
  if (slot === 'SNACK') return '간식';
  return '식사';
}

function analyzeMeals(
  meals: MealRow[],
  kind: AiPeriodKind,
  comparison?: PeriodComparison,
): MealPatternAnalysis {
  const daysWithBreakfast = new Set<string>();
  const daysWithAny = new Set<string>();
  const weekdayBreakfastSkip = new Map<number, number>();
  let proteinShortMeals = 0;
  const foodCounts = new Map<string, number>();
  const dinnerHighCal: MealRow[] = [];

  const proteinPerMealThreshold = 12;

  for (const m of meals) {
    const ymd = todayAnchorKst(m.consumedAt);
    daysWithAny.add(ymd);
    if (m.mealSlot === 'BREAKFAST') daysWithBreakfast.add(ymd);
    if (m.protein < proteinPerMealThreshold) proteinShortMeals += 1;
    foodCounts.set(m.name, (foodCounts.get(m.name) ?? 0) + 1);
    if (m.mealSlot === 'DINNER' && m.calories >= 500) dinnerHighCal.push(m);
  }

  const breakfastSkipDays = Math.max(0, daysWithAny.size - daysWithBreakfast.size);
  for (const ymd of daysWithAny) {
    if (!daysWithBreakfast.has(ymd)) {
      const wd = weekdayIndexKst(ymd);
      weekdayBreakfastSkip.set(wd, (weekdayBreakfastSkip.get(wd) ?? 0) + 1);
    }
  }

  const frequentFoods = [...foodCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const keyMetrics: PeriodKeyMetrics = {
    breakfastSkipDays,
    proteinShortMeals,
  };

  const patterns: PatternItem[] = [];
  if (breakfastSkipDays >= 2) {
    patterns.push({
      id: 'breakfast_skip',
      title: '아침 결식 패턴',
      detail: `기록된 ${daysWithAny.size}일 중 ${breakfastSkipDays}일 아침 식사 기록이 없습니다.`,
    });
  }
  if (dinnerHighCal.length >= 2) {
    patterns.push({
      id: 'dinner_heavy',
      title: '저녁 고칼로리·나트륨 식사',
      detail: `저녁에 칼로리가 높은 식사(500kcal 이상)가 ${dinnerHighCal.length}회 기록되었습니다.`,
    });
  }
  if (proteinShortMeals >= 3) {
    patterns.push({
      id: 'protein_short',
      title: '단백질 부족 끼니',
      detail: `단백질이 ${proteinPerMealThreshold}g 미만인 끼니가 ${proteinShortMeals}회 있습니다.`,
    });
  }
  if (frequentFoods[0] && frequentFoods[0].count >= 3) {
    patterns.push({
      id: 'repeat_food',
      title: '반복 섭취 음식',
      detail: `「${frequentFoods[0].name}」이(가) ${frequentFoods[0].count}회 반복되었습니다.`,
    });
  }

  if (comparison && comparison.recordedDaysDelta > 0) {
    patterns.push({
      id: 'more_records',
      title: '기록 증가',
      detail: `${comparison.previousLabel} 대비 기록일이 ${comparison.recordedDaysDelta}일 늘었습니다.`,
    });
  }

  const evidence: EvidenceItem[] = [];
  for (const ymd of [...daysWithAny].filter((d) => !daysWithBreakfast.has(d)).slice(0, 2)) {
    evidence.push({ date: ymd, slot: '아침', foodName: '기록 없음' });
  }
  for (const m of dinnerHighCal.slice(0, 2)) {
    evidence.push({
      date: todayAnchorKst(m.consumedAt),
      slot: slotLabel(m.mealSlot),
      foodName: m.name,
      mealId: m.id,
    });
  }
  for (const f of frequentFoods.slice(0, 2)) {
    const sample = meals.find((m) => m.name === f.name);
    if (sample) {
      evidence.push({
        date: todayAnchorKst(sample.consumedAt),
        slot: slotLabel(sample.mealSlot),
        foodName: sample.name,
        mealId: sample.id,
      });
    }
  }

  const nextGoals: string[] = [];
  if (breakfastSkipDays >= 2) {
    nextGoals.push('아침에 삶은 달걀·요거트·두부 등 간단한 단백질을 추가해 보세요.');
  }
  if (proteinShortMeals >= 3) {
    nextGoals.push('단백질이 부족한 끼니에 달걀·두부·살코기를 추가해 보세요.');
  }
  if (nextGoals.length === 0 && meals.length > 0) {
    nextGoals.push('현재 기록 패턴을 유지하면서 끼니별 균형을 점검해 보세요.');
  }
  if (meals.length === 0) {
    nextGoals.push('식단을 기록하면 맞춤 리포트를 받을 수 있습니다.');
  }

  const breakfastSkipByWeekday =
    kind === 'month_single'
      ? [...weekdayBreakfastSkip.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([wd, skipDays]) => ({ weekday: WEEKDAY_KO[wd], skipDays }))
      : undefined;

  return {
    keyMetrics,
    patterns: patterns.slice(0, 5),
    evidence: evidence.slice(0, 6),
    nextGoals: nextGoals.slice(0, 4),
    frequentFoods,
    breakfastSkipByWeekday,
    comparison,
  };
}

export async function buildMealPatternAnalysis(
  userId: string,
  kind: AiPeriodKind,
  anchorYmd: string,
  agg: AiAggregateResult,
): Promise<MealPatternAnalysis> {
  const meals = await fetchMealsInPeriod(userId, kind, anchorYmd);
  let comparison: PeriodComparison | undefined;

  const prevAnchor = previousPeriodAnchor(kind, anchorYmd);
  const prevMeals = await fetchMealsInPeriod(userId, kind, prevAnchor);
  const prevDays = new Set(prevMeals.map((m) => todayAnchorKst(m.consumedAt))).size;
  const curDays = agg.computed.periodMeta.recordedDays;
  const prevBounds = resolveAiPeriodBounds(kind, prevAnchor);

  comparison = {
    recordedDaysDelta: curDays - prevDays,
    previousLabel: prevBounds.label,
  };

  return analyzeMeals(meals, kind, comparison);
}
