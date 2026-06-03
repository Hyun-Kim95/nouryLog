import { prisma } from '../../lib/prisma.js';
import { addDaysYmd, todayAnchorKst } from '../../lib/statsPeriod.js';
import type { AiPeriodKind } from './aiStatsPeriod.js';
import { resolveAiPeriodBounds } from './aiStatsPeriod.js';
import type { AiAggregateResult } from './aiMealAggregate.js';

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

const OUTSIDE_FOOD_RE =
  /치킨|피자|라면|햄버거|배달|편의점|술|맥주|소주|찜닭|족발|떡볶이|김밥|도시락|패스트|외식/i;
const VEGETABLE_FOOD_RE = /샐러드|채소|나물|야채|브로콜리|시금치|상추|양배추/i;

export type PeriodKeyMetrics = {
  breakfastSkipDays: number;
  proteinShortMeals: number;
  outsideMealCount: number;
  vegetableMealCount: number;
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
  vegetableMealDelta: number;
  outsideMealDelta: number;
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
  let outsideMealCount = 0;
  let vegetableMealCount = 0;
  const foodCounts = new Map<string, number>();
  const dinnerHighCal: MealRow[] = [];

  const proteinPerMealThreshold = 12;

  for (const m of meals) {
    const ymd = todayAnchorKst(m.consumedAt);
    daysWithAny.add(ymd);
    if (m.mealSlot === 'BREAKFAST') daysWithBreakfast.add(ymd);
    if (m.protein < proteinPerMealThreshold) proteinShortMeals += 1;
    if (OUTSIDE_FOOD_RE.test(m.name)) outsideMealCount += 1;
    if (VEGETABLE_FOOD_RE.test(m.name)) vegetableMealCount += 1;
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
    outsideMealCount,
    vegetableMealCount,
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
  if (outsideMealCount >= 2) {
    patterns.push({
      id: 'outside_food',
      title: '외식·배달 비중',
      detail: `기록 기준으로 외식·배달·편의 식사로 보이는 항목이 ${outsideMealCount}회 있습니다.`,
    });
  }
  if (vegetableMealCount <= 1 && meals.length >= 5) {
    patterns.push({
      id: 'low_vegetable',
      title: '채소·식이섬유 부족',
      detail: '채소·샐러드류 기록이 적어 식이섬유 섭취가 부족해 보입니다.',
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
  if (comparison && comparison.vegetableMealDelta > 0) {
    patterns.push({
      id: 'veg_improved',
      title: '채소 기록 증가',
      detail: `지난 기간보다 채소·샐러드류 기록이 ${comparison.vegetableMealDelta}회 늘었습니다.`,
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
  if (outsideMealCount >= 2) {
    nextGoals.push(
      kind === 'week_single'
        ? '저녁 배달·외식은 주 2회 이하로 줄여 보세요.'
        : '배달·외식 빈도를 줄이고 점심을 가볍게 조정해 보세요.',
    );
  }
  if (vegetableMealCount < 3) {
    nextGoals.push(
      kind === 'week_single'
        ? '이번 주 채소가 포함된 식사를 3회 이상 기록해 보세요.'
        : '다음 달 채소·샐러드 포함 식사를 주 3회 이상 목표로 삼아 보세요.',
    );
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
  const prevVeg = prevMeals.filter((m) => VEGETABLE_FOOD_RE.test(m.name)).length;
  const curVeg = meals.filter((m) => VEGETABLE_FOOD_RE.test(m.name)).length;
  const prevOut = prevMeals.filter((m) => OUTSIDE_FOOD_RE.test(m.name)).length;
  const curOut = meals.filter((m) => OUTSIDE_FOOD_RE.test(m.name)).length;
  const prevBounds = resolveAiPeriodBounds(kind, prevAnchor);

  comparison = {
    recordedDaysDelta: curDays - prevDays,
    vegetableMealDelta: curVeg - prevVeg,
    outsideMealDelta: curOut - prevOut,
    previousLabel: prevBounds.label,
  };

  return analyzeMeals(meals, kind, comparison);
}
