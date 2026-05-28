import type { MealInputMode, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { resolvedReferenceAmount } from '../lib/foodTemplateReference.js';

export type FoodTemplatePublicRow = {
  id: string;
  name: string;
  memo: string | null;
  category: string | null;
  portionUnit: string;
  portionLabel: string | null;
  referenceAmount: number;
  servingGrams: number;
  calories: number;
  protein: number;
  fat: number;
  carbohydrate: number;
};

export type MealSuggestionMealRow = {
  mealId: string;
  name: string;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  foodTemplateId: string | null;
  mealInputMode: MealInputMode | null;
  portionQuantity: number | null;
  consumedAt: string;
};

export type MealEntrySuggestionItem =
  | { kind: 'template'; template: FoodTemplatePublicRow }
  | { kind: 'past_meal'; meal: MealSuggestionMealRow };

const FOOD_TEMPLATE_WHERE_BASE: Prisma.FoodTemplateWhereInput = {
  active: true,
  servingGrams: { gt: 0 },
  calories: { not: null },
  protein: { not: null },
  fat: { not: null },
  carbohydrate: { not: null },
};

function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

export function mapFoodTemplatePublic(f: {
  id: string;
  name: string;
  memo: string | null;
  category: string | null;
  portionUnit: string;
  portionLabel: string | null;
  referenceAmount: number | null;
  servingGrams: number | null;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbohydrate: number | null;
}): FoodTemplatePublicRow {
  return {
    id: f.id,
    name: f.name,
    memo: f.memo,
    category: f.category,
    portionUnit: f.portionUnit,
    portionLabel: f.portionLabel,
    referenceAmount: resolvedReferenceAmount(f),
    servingGrams: f.servingGrams!,
    calories: f.calories!,
    protein: f.protein!,
    fat: f.fat!,
    carbohydrate: f.carbohydrate!,
  };
}

/** 템플릿 우선, 이름(lower trim) 중복 제거, 식사는 consumedAt desc 순서에서 이름별 최신 1건. */
export function mergeMealEntrySuggestions(
  templates: FoodTemplatePublicRow[],
  meals: MealSuggestionMealRow[],
  limit: number,
): MealEntrySuggestionItem[] {
  const seen = new Set<string>();
  const out: MealEntrySuggestionItem[] = [];

  for (const template of templates) {
    const key = nameKey(template.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: 'template', template });
    if (out.length >= limit) return out;
  }

  for (const meal of meals) {
    const key = nameKey(meal.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: 'past_meal', meal });
    if (out.length >= limit) return out;
  }

  return out;
}

function dedupeMealsByNameNewestFirst(meals: MealSuggestionMealRow[]): MealSuggestionMealRow[] {
  const byName = new Map<string, MealSuggestionMealRow>();
  for (const m of meals) {
    const key = nameKey(m.name);
    if (!key || byName.has(key)) continue;
    byName.set(key, m);
  }
  return [...byName.values()];
}

export async function buildMealEntrySuggestions(params: {
  userId: string;
  q: string;
  limit: number;
}): Promise<MealEntrySuggestionItem[]> {
  const needle = params.q.trim();
  const limit = params.limit;
  const mealTake = Math.min(80, limit * 10);

  const nameFilter = { contains: needle, mode: 'insensitive' as const };

  const [templateRows, mealRows] = await Promise.all([
    prisma.foodTemplate.findMany({
      where: {
        ...FOOD_TEMPLATE_WHERE_BASE,
        name: nameFilter,
      },
      orderBy: { name: 'asc' },
      take: limit,
    }),
    prisma.meal.findMany({
      where: {
        userId: params.userId,
        active: true,
        name: nameFilter,
      },
      orderBy: { consumedAt: 'desc' },
      take: mealTake,
      select: {
        id: true,
        name: true,
        calories: true,
        protein: true,
        carbohydrate: true,
        fat: true,
        foodTemplateId: true,
        mealInputMode: true,
        portionQuantity: true,
        consumedAt: true,
      },
    }),
  ]);

  const templates = templateRows.map((f) => mapFoodTemplatePublic(f));
  const meals = dedupeMealsByNameNewestFirst(
    mealRows.map((m) => ({
      mealId: m.id,
      name: m.name,
      calories: m.calories,
      protein: m.protein,
      carbohydrate: m.carbohydrate,
      fat: m.fat,
      foodTemplateId: m.foodTemplateId,
      mealInputMode: m.mealInputMode,
      portionQuantity: m.portionQuantity,
      consumedAt: m.consumedAt.toISOString(),
    })),
  );

  return mergeMealEntrySuggestions(templates, meals, limit);
}

export function parseMealEntrySuggestionsLimit(raw: unknown): number {
  if (raw === undefined || raw === null || raw === '') return 8;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 8;
  return Math.min(15, Math.max(1, Math.floor(n)));
}
