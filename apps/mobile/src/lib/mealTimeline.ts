import type { MealRow } from '../api/meals';
import { localDayBounds } from './dateRange';
import {
  mealSlotLabel,
  snackPlacementLabel,
  type MealSlot,
  type SnackPlacement,
} from './mealSlot';

export type TimelineSectionKind =
  | 'snack_before_breakfast'
  | 'breakfast'
  | 'snack_between_breakfast_lunch'
  | 'lunch'
  | 'snack_between_lunch_dinner'
  | 'dinner'
  | 'snack_after_dinner'
  | 'unspecified';

export type TimelineSection = {
  kind: TimelineSectionKind;
  title: string;
  items: MealRow[];
  summaryKcal: number;
  summaryProteinG: number;
};

const SECTION_ORDER: TimelineSectionKind[] = [
  'snack_before_breakfast',
  'breakfast',
  'snack_between_breakfast_lunch',
  'lunch',
  'snack_between_lunch_dinner',
  'dinner',
  'snack_after_dinner',
  'unspecified',
];

const SECTION_TITLES: Record<TimelineSectionKind, string> = {
  snack_before_breakfast: '아침 전 간식',
  breakfast: '아침',
  snack_between_breakfast_lunch: '아침·점심 사이 간식',
  lunch: '점심',
  snack_between_lunch_dinner: '점심·저녁 사이 간식',
  dinner: '저녁',
  snack_after_dinner: '저녁 후 간식',
  unspecified: '미분류',
};

function placementToSection(placement: SnackPlacement): TimelineSectionKind {
  switch (placement) {
    case 'BEFORE_BREAKFAST':
      return 'snack_before_breakfast';
    case 'BETWEEN_BREAKFAST_LUNCH':
      return 'snack_between_breakfast_lunch';
    case 'BETWEEN_LUNCH_DINNER':
      return 'snack_between_lunch_dinner';
    case 'AFTER_DINNER':
      return 'snack_after_dinner';
    default:
      return 'unspecified';
  }
}

function mealToSection(m: MealRow): TimelineSectionKind {
  if (!m.mealSlot) return 'unspecified';
  if (m.mealSlot === 'SNACK') {
    if (m.snackPlacement) return placementToSection(m.snackPlacement);
    return 'unspecified';
  }
  if (m.mealSlot === 'BREAKFAST') return 'breakfast';
  if (m.mealSlot === 'LUNCH') return 'lunch';
  if (m.mealSlot === 'DINNER') return 'dinner';
  return 'unspecified';
}

function isTodayMeal(consumedAt: string): boolean {
  const { from, to } = localDayBounds();
  const t = new Date(consumedAt).getTime();
  return t >= new Date(from).getTime() && t <= new Date(to).getTime();
}

function sumSection(items: MealRow[]) {
  let summaryKcal = 0;
  let summaryProteinG = 0;
  let summaryCarbG = 0;
  let summaryFatG = 0;
  for (const m of items) {
    summaryKcal += Number(m.calories ?? 0);
    summaryProteinG += Number(m.protein ?? 0);
    summaryCarbG += Number(m.carbohydrate ?? 0);
    summaryFatG += Number(m.fat ?? 0);
  }
  return {
    summaryKcal: Math.round(summaryKcal),
    summaryProteinG: Math.round(summaryProteinG),
    summaryCarbG: Math.round(summaryCarbG),
    summaryFatG: Math.round(summaryFatG),
  };
}

export function groupMealsBySlotTimeline(meals: MealRow[]): TimelineSection[] {
  const buckets = new Map<TimelineSectionKind, MealRow[]>();
  for (const kind of SECTION_ORDER) buckets.set(kind, []);

  for (const m of meals) {
    const kind = mealToSection(m);
    buckets.get(kind)!.push(m);
  }

  for (const [, list] of buckets) {
    list.sort((a, b) => new Date(a.consumedAt).getTime() - new Date(b.consumedAt).getTime());
  }

  return SECTION_ORDER.map((kind) => {
    const items = buckets.get(kind) ?? [];
    const { summaryKcal, summaryProteinG } = sumSection(items);
    return { kind, title: SECTION_TITLES[kind], items, summaryKcal, summaryProteinG };
  });
}

export function groupMealsForTodayTimeline(meals: MealRow[]): TimelineSection[] {
  const today = meals.filter((m) => isTodayMeal(m.consumedAt));
  return groupMealsBySlotTimeline(today);
}

export function summarizeByMealSlot(meals: MealRow[]): Array<{
  slot: MealSlot | 'UNSPECIFIED';
  label: string;
  summaryKcal: number;
  summaryProteinG: number;
  summaryCarbG: number;
  summaryFatG: number;
  count: number;
}> {
  const today = meals.filter((m) => isTodayMeal(m.consumedAt));
  const slots: Array<MealSlot | 'UNSPECIFIED'> = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'UNSPECIFIED'];
  return slots.map((slot) => {
    const filtered =
      slot === 'UNSPECIFIED'
        ? today.filter((m) => !m.mealSlot)
        : today.filter((m) => m.mealSlot === slot);
    const { summaryKcal, summaryProteinG, summaryCarbG, summaryFatG } = sumSection(filtered);
    const label = slot === 'UNSPECIFIED' ? '미분류' : mealSlotLabel(slot);
    return { slot, label, summaryKcal, summaryProteinG, summaryCarbG, summaryFatG, count: filtered.length };
  });
}

export function mealRowSubtitle(m: MealRow): string {
  if (m.mealSlot === 'SNACK' && m.snackPlacement) {
    return `${snackPlacementLabel(m.snackPlacement)} · ${m.name}`;
  }
  return `${mealSlotLabel(m.mealSlot)} · ${m.name}`;
}

export function filterOlderThanToday(meals: MealRow[]): MealRow[] {
  const { from } = localDayBounds();
  const start = new Date(from).getTime();
  return meals.filter((m) => new Date(m.consumedAt).getTime() < start);
}
