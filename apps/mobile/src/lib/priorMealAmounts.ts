import type { FoodTemplateItem, MealRow } from '../api/meals';
import {
  buildFoodTemplateMap,
  formatListMealQuantity,
  listMealQuantityDisplay,
} from './listMealQuantityDisplay';
import { unitHint } from './mealEntryForm';
import { isLikelyUnsetManualGrams } from './unsetManualGrams';

export type MealMacros = {
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
};

export type IntakeUnitOption = {
  id: string;
  label: string;
  kind: 'grams' | 'portion';
  /** grams per 1 unit; null when kind=grams */
  servingGrams: number | null;
  /** nutrition for 1 unit (portion) when known */
  perUnitMacros: MealMacros | null;
};

export type PriorMealAmount = {
  id: string;
  label: string;
  grams: number;
  count: number;
  unitId: string;
  unitLabel: string;
  unitQuantity: number;
  macros: MealMacros;
};

function normalizeFoodName(name: string): string {
  return name.trim().replace(/\s+/g, '');
}

/** Exact name match after trim; avoids 「김」↔「김·밥」 false positives. */
export function mealNameMatchesQuery(mealName: string, query: string): boolean {
  const q = query.trim();
  if (!q) return false;
  return mealName.trim() === q || normalizeFoodName(mealName) === normalizeFoodName(q);
}

function mealMacros(meal: MealRow): MealMacros {
  return {
    calories: meal.calories,
    protein: meal.protein,
    carbohydrate: meal.carbohydrate,
    fat: meal.fat,
  };
}

function scaleMacros(macros: MealMacros, scale: number): MealMacros {
  return {
    calories: macros.calories * scale,
    protein: macros.protein * scale,
    carbohydrate: macros.carbohydrate * scale,
    fat: macros.fat * scale,
  };
}

/**
 * Aggregate prior intake amounts for the typed food name (frequency desc).
 * Each chip carries sample macros from the most recent matching meal.
 */
export function priorMealAmountsForName(
  foodName: string,
  meals: MealRow[],
  templates: FoodTemplateItem[] | Map<string, FoodTemplateItem>,
  limit = 5,
): PriorMealAmount[] {
  const q = foodName.trim();
  if (!q || limit <= 0) return [];

  const tplById =
    templates instanceof Map ? templates : buildFoodTemplateMap(templates);

  type Agg = {
    label: string;
    grams: number;
    count: number;
    lastIndex: number;
    unitId: string;
    unitLabel: string;
    unitQuantity: number;
    macros: MealMacros;
  };
  const byKey = new Map<string, Agg>();

  meals.forEach((meal, index) => {
    if (!mealNameMatchesQuery(meal.name, q)) return;
    // Skip legacy "default 100g" manuals — not a real prior amount choice.
    if (isLikelyUnsetManualGrams(meal)) return;
    const disp = listMealQuantityDisplay(meal, tplById);
    if (!disp || !(disp.quantity > 0)) return;

    let grams: number;
    let label: string;
    let key: string;
    let unitId: string;
    let unitLabel: string;
    let unitQuantity: number;

    if (disp.stepMode === 'portion' && disp.servingGrams != null && disp.servingGrams > 0) {
      grams = Math.round(disp.quantity * disp.servingGrams * 10) / 10;
      unitLabel = disp.unitLabel;
      unitId = `p:${unitLabel}:${disp.servingGrams}`;
      unitQuantity = disp.quantity;
      label = `${formatListMealQuantity(disp.quantity)}${unitLabel}`;
      key = `p:${disp.quantity}:${unitLabel}:${disp.servingGrams}`;
    } else {
      grams = disp.quantity;
      unitLabel = 'g';
      unitId = 'g';
      unitQuantity = grams;
      label = `${formatListMealQuantity(grams)}g`;
      key = `g:${grams}`;
    }

    if (!(grams > 0)) return;
    const prev = byKey.get(key);
    if (prev) {
      prev.count += 1;
      if (index < prev.lastIndex) {
        prev.lastIndex = index;
        prev.macros = mealMacros(meal);
      }
    } else {
      byKey.set(key, {
        label,
        grams,
        count: 1,
        lastIndex: index,
        unitId,
        unitLabel,
        unitQuantity,
        macros: mealMacros(meal),
      });
    }
  });

  return [...byKey.values()]
    .sort((a, b) => b.count - a.count || a.lastIndex - b.lastIndex)
    .slice(0, limit)
    .map((a) => ({
      id: `${a.label}:${a.grams}`,
      label: a.label,
      grams: a.grams,
      count: a.count,
      unitId: a.unitId,
      unitLabel: a.unitLabel,
      unitQuantity: a.unitQuantity,
      macros: a.macros,
    }));
}

/** Unit choices for the current food name: always g, plus portion units from history/templates. */
export function intakeUnitOptionsForName(
  foodName: string,
  meals: MealRow[],
  templates: FoodTemplateItem[],
): IntakeUnitOption[] {
  const options: IntakeUnitOption[] = [
    { id: 'g', label: 'g', kind: 'grams', servingGrams: null, perUnitMacros: null },
  ];
  const q = foodName.trim();
  if (!q) return options;

  const tplById = buildFoodTemplateMap(templates);
  const seen = new Set<string>(['g']);

  for (const meal of meals) {
    if (!mealNameMatchesQuery(meal.name, q)) continue;
    const disp = listMealQuantityDisplay(meal, tplById);
    if (!disp || disp.stepMode !== 'portion' || !(disp.servingGrams! > 0)) continue;
    const id = `p:${disp.unitLabel}:${disp.servingGrams}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const perUnit =
      disp.quantity > 0 ? scaleMacros(mealMacros(meal), 1 / disp.quantity) : null;
    options.push({
      id,
      label: disp.unitLabel,
      kind: 'portion',
      servingGrams: disp.servingGrams,
      perUnitMacros: perUnit,
    });
  }

  for (const tpl of templates) {
    if (!mealNameMatchesQuery(tpl.name, q)) continue;
    if (!(tpl.servingGrams > 0) || tpl.portionUnit === 'GRAM') continue;
    const unitLabel =
      tpl.portionLabel ||
      (tpl.portionUnit === 'PIECE'
        ? '개'
        : tpl.portionUnit === 'PLATE'
          ? '접시'
          : tpl.portionUnit === 'BOWL'
            ? '공기'
            : '단위');
    const id = `p:${unitLabel}:${tpl.servingGrams}`;
    if (seen.has(id)) continue;
    seen.add(id);
    options.push({
      id,
      label: unitLabel,
      kind: 'portion',
      servingGrams: tpl.servingGrams,
      perUnitMacros: {
        calories: tpl.calories,
        protein: tpl.protein,
        carbohydrate: tpl.carbohydrate,
        fat: tpl.fat,
      },
    });
  }

  return options;
}

export function gramsFromIntakeAmount(
  unit: IntakeUnitOption,
  amountText: string,
): number | null {
  const n = Number(String(amountText).replace(',', '.').trim());
  if (!Number.isFinite(n) || !(n > 0)) return null;
  if (unit.kind === 'grams') return n;
  if (unit.servingGrams == null || !(unit.servingGrams > 0)) return null;
  return Math.round(n * unit.servingGrams * 10) / 10;
}

export function displayAmountFromGrams(unit: IntakeUnitOption, grams: number): string {
  if (!(grams > 0)) return '';
  if (unit.kind === 'grams' || !unit.servingGrams) {
    return formatListMealQuantity(grams);
  }
  const qty = Math.round((grams / unit.servingGrams) * 100) / 100;
  return formatListMealQuantity(qty);
}

export function macrosForIntakeAmount(
  unit: IntakeUnitOption,
  amountText: string,
): MealMacros | null {
  if (unit.kind !== 'portion' || !unit.perUnitMacros) return null;
  const n = Number(String(amountText).replace(',', '.').trim());
  if (!Number.isFinite(n) || !(n > 0)) return null;
  return scaleMacros(unit.perUnitMacros, n);
}

/** Resolve FoodTemplate for portion-unit save so list keeps 개/접시. */
export function findTemplateForIntakeUnit(
  foodName: string,
  unit: IntakeUnitOption,
  templates: FoodTemplateItem[],
): FoodTemplateItem | null {
  if (unit.kind !== 'portion' || !(unit.servingGrams != null && unit.servingGrams > 0)) {
    return null;
  }
  const q = foodName.trim();
  if (!q) return null;

  const scored = templates.filter((tpl) => {
    if (!mealNameMatchesQuery(tpl.name, q)) return false;
    if (!(tpl.servingGrams > 0)) return false;
    if (tpl.portionUnit === 'GRAM') return false;
    return Math.abs(tpl.servingGrams - unit.servingGrams!) < 0.05;
  });
  if (scored.length === 0) return null;

  const labelMatch = scored.find((tpl) => unitHint(tpl) === unit.label);
  return labelMatch ?? scored[0]!;
}
