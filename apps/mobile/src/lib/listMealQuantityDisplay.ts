import type { FoodTemplateItem, MealRow } from '../api/meals';
import { effectiveMealGrams } from './adjustMealGramsCore';
import { formatTplAmount, unitHint } from './mealEntryForm';
import {
  NUTRITION_FOOD_GRAMS_MAX,
  NUTRITION_FOOD_GRAMS_MIN,
} from './nutritionFoodScale';
import { isLikelyUnsetManualGrams } from './unsetManualGrams';

export const MEAL_PORTION_QTY_MIN = 0.1;
export const MEAL_PORTION_QTY_MAX = 50;
/** List −/+ steps one unit; modal still accepts 0.1. */
export const MEAL_PORTION_STEP = 1;

type MealQtyFields = Pick<
  MealRow,
  'grams' | 'foodTemplateId' | 'mealInputMode' | 'portionQuantity' | 'portionLabel'
> & { name?: string };

function foodNamesEqual(a: string, b: string): boolean {
  const na = a.trim();
  const nb = b.trim();
  if (!na || !nb) return false;
  if (na === nb) return true;
  return na.replace(/\s+/g, '') === nb.replace(/\s+/g, '');
}

/** Infer N{unit} when grams is a serving multiple of a same-name portion template. */
function inferPortionFromTemplates(
  meal: MealQtyFields,
  templates: Iterable<FoodTemplateItem>,
  grams: number,
): ListMealQuantityDisplay | null {
  const q = meal.name?.trim() ?? '';
  if (!q) return null;

  let best: ListMealQuantityDisplay | null = null;
  let bestAbsErr = Infinity;
  let bestIsInteger = false;

  for (const tpl of templates) {
    if (!foodNamesEqual(tpl.name, q)) continue;
    if (!(tpl.servingGrams > 0) || tpl.portionUnit === 'GRAM') continue;
    const rawQty = grams / tpl.servingGrams;
    const qty = normalizeMealPortionQuantity(rawQty);
    if (qty < MEAL_PORTION_QTY_MIN || qty > MEAL_PORTION_QTY_MAX) continue;
    const reconstructed = Math.round(qty * tpl.servingGrams * 10) / 10;
    const absErr = Math.abs(reconstructed - grams);
    if (absErr > 0.05) continue;
    const isInteger = Math.abs(qty - Math.round(qty)) < 0.001;
    if (
      !best ||
      (isInteger && !bestIsInteger) ||
      (isInteger === bestIsInteger && absErr < bestAbsErr)
    ) {
      bestIsInteger = isInteger;
      bestAbsErr = absErr;
      best = {
        stepMode: 'portion',
        quantity: qty,
        unitLabel: unitHint(tpl),
        servingGrams: tpl.servingGrams,
        foodTemplateId: null,
      };
    }
  }
  return best;
}

export type ListMealStepMode = 'grams' | 'portion';

export type ListMealQuantityDisplay = {
  stepMode: ListMealStepMode;
  /** Display / stepper quantity (portion count or grams). */
  quantity: number;
  unitLabel: string;
  servingGrams: number | null;
  foodTemplateId: string | null;
};

export function buildFoodTemplateMap(
  templates: FoodTemplateItem[],
): Map<string, FoodTemplateItem> {
  return new Map(templates.map((t) => [t.id, t]));
}

/** AC-09: PORTION_COUNT + template → N{unit}; else snapshot label; else same-name template multiple; else grams. */
export function listMealQuantityDisplay(
  meal: MealQtyFields,
  tplById: Map<string, FoodTemplateItem>,
): ListMealQuantityDisplay | null {
  const tplId = meal.foodTemplateId?.trim() || null;
  const tpl = tplId ? tplById.get(tplId) : undefined;
  const hasPortionQty =
    meal.mealInputMode === 'PORTION_COUNT' &&
    meal.portionQuantity != null &&
    Number.isFinite(meal.portionQuantity) &&
    meal.portionQuantity > 0;

  if (tplId && hasPortionQty) {
    if (tpl && tpl.servingGrams > 0) {
      return {
        stepMode: 'portion',
        quantity: meal.portionQuantity!,
        unitLabel: unitHint(tpl),
        servingGrams: tpl.servingGrams,
        foodTemplateId: tplId,
      };
    }
    // Template linked but not loaded — never fall through to grams ± (clears FK).
    return {
      stepMode: 'portion',
      quantity: meal.portionQuantity!,
      unitLabel: '단위',
      servingGrams: null,
      foodTemplateId: tplId,
    };
  }

  const snapshotLabel = meal.portionLabel?.trim() || '';
  if (!tplId && hasPortionQty && snapshotLabel) {
    const grams = effectiveMealGrams(meal.grams);
    const qty = meal.portionQuantity!;
    if (grams > 0) {
      const servingGrams = Math.round((grams / qty) * 10) / 10;
      if (servingGrams > 0) {
        return {
          stepMode: 'portion',
          quantity: qty,
          unitLabel: snapshotLabel,
          servingGrams,
          foodTemplateId: null,
        };
      }
    }
  }

  // Missing/invalid grams only — intentional 100g (NF/manual) stays visible.
  if (isLikelyUnsetManualGrams(meal)) {
    return null;
  }

  const grams = effectiveMealGrams(meal.grams);
  if (!(grams > 0)) return null;

  const inferred = inferPortionFromTemplates(meal, tplById.values(), grams);
  if (inferred) return inferred;

  return {
    stepMode: 'grams',
    quantity: grams,
    unitLabel: 'g',
    servingGrams: null,
    foodTemplateId: null,
  };
}

export function formatListMealQuantity(quantity: number): string {
  return formatTplAmount(quantity) || String(quantity);
}

/** Normalize to one decimal place (0.1 step). */
export function normalizeMealPortionQuantity(qty: number): number {
  return Math.round(qty * 10) / 10;
}

export function nextMealPortionQuantity(
  currentQty: number,
  delta: number,
): number | null {
  if (!(currentQty > 0) || !Number.isFinite(currentQty)) return null;
  const next = normalizeMealPortionQuantity(currentQty + delta);
  if (next < MEAL_PORTION_QTY_MIN || next > MEAL_PORTION_QTY_MAX) return null;
  if (Math.abs(next - currentQty) < 0.001) return null;
  return next;
}

export function portionQuantityToGrams(
  portionQty: number,
  servingGrams: number,
): number | null {
  if (!(portionQty > 0) || !(servingGrams > 0)) return null;
  const grams = Math.round(portionQty * servingGrams * 10) / 10;
  if (grams < NUTRITION_FOOD_GRAMS_MIN || grams > NUTRITION_FOOD_GRAMS_MAX) return null;
  return grams;
}

/** True when meal should stay on portion-unit list UX (개/접시…). */
export function isLegacyPortionMeal(
  meal: Pick<MealRow, 'foodTemplateId' | 'mealInputMode' | 'portionQuantity'>,
): boolean {
  return (
    Boolean(meal.foodTemplateId?.trim()) &&
    meal.mealInputMode === 'PORTION_COUNT' &&
    meal.portionQuantity != null &&
    Number.isFinite(meal.portionQuantity) &&
    meal.portionQuantity > 0
  );
}

/**
 * List −/+ is allowed only when quantity can be shown and safely adjusted.
 * PORTION_COUNT without a loaded template is visible but not ±-adjustable.
 */
export type ListQuantityAdjust =
  | { ok: true; mode: 'portion-template'; portionQty: number }
  | {
      ok: true;
      mode: 'grams';
      grams: number;
      /** Keep/update no-template PORTION snapshot so list stays N{unit}. */
      portionSnapshot?: { quantity: number; label: string };
    }
  | { ok: false; reason: 'template-missing' | 'grams-missing' | 'portion-invalid' | 'grams-invalid' };

export function resolveListQuantityAdjust(
  item: MealQtyFields,
  nextQty: number,
  tplById: Map<string, FoodTemplateItem>,
): ListQuantityAdjust {
  if (isLegacyPortionMeal(item)) {
    const tplId = item.foodTemplateId?.trim() || null;
    const tpl = tplId ? tplById.get(tplId) : undefined;
    if (!tpl || !(tpl.servingGrams > 0)) {
      return { ok: false, reason: 'template-missing' };
    }
    const disp = listMealQuantityDisplay(item, tplById);
    let nextPortion = nextQty;
    if (disp?.stepMode !== 'portion') {
      const converted = gramsToPortionQuantity(nextQty, tpl.servingGrams);
      if (converted == null) return { ok: false, reason: 'portion-invalid' };
      nextPortion = converted;
    }
    if (nextPortion < MEAL_PORTION_QTY_MIN || nextPortion > MEAL_PORTION_QTY_MAX) {
      return { ok: false, reason: 'portion-invalid' };
    }
    return { ok: true, mode: 'portion-template', portionQty: nextPortion };
  }

  if (!(effectiveMealGrams(item.grams) > 0)) {
    return { ok: false, reason: 'grams-missing' };
  }

  const disp = listMealQuantityDisplay(item, tplById);
  if (disp?.stepMode === 'portion' && disp.servingGrams != null && disp.servingGrams > 0) {
    const grams = portionQuantityToGrams(nextQty, disp.servingGrams);
    if (grams == null) return { ok: false, reason: 'portion-invalid' };
    const snapshotLabel = disp.unitLabel.trim();
    return {
      ok: true,
      mode: 'grams',
      grams,
      ...(snapshotLabel
        ? { portionSnapshot: { quantity: nextQty, label: snapshotLabel } }
        : {}),
    };
  }

  if (nextQty < NUTRITION_FOOD_GRAMS_MIN || nextQty > NUTRITION_FOOD_GRAMS_MAX) {
    return { ok: false, reason: 'grams-invalid' };
  }
  return { ok: true, mode: 'grams', grams: nextQty };
}

export function canAdjustMealQuantityInList(
  meal: MealQtyFields,
  templates: FoodTemplateItem[] | Map<string, FoodTemplateItem>,
): boolean {
  const tplById = templates instanceof Map ? templates : buildFoodTemplateMap(templates);
  const disp = listMealQuantityDisplay(meal, tplById);
  if (disp == null) return false;
  if (disp.stepMode === 'portion' && !(disp.servingGrams != null && disp.servingGrams > 0)) {
    return false;
  }
  return true;
}

/** Map form grams → portionQuantity for template PUT (keeps 개/접시 display). */
export function gramsToPortionQuantity(
  grams: number,
  servingGrams: number,
): number | null {
  if (!(grams > 0) || !(servingGrams > 0)) return null;
  const qty = normalizeMealPortionQuantity(grams / servingGrams);
  if (qty < MEAL_PORTION_QTY_MIN || qty > MEAL_PORTION_QTY_MAX) return null;
  return qty;
}
