import type { FoodTemplateItem, MealRow, TemplateInputMode } from '../api/meals';
import { parseManualNutrition } from './manualNutrition';
import {
  defaultSnackPlacementForNow,
  type MealSlot,
  type SnackPlacement,
} from './mealSlot';

export type MealEditFormState = {
  mealId: string;
  consumedAt: string;
  mealSlot: MealSlot;
  snackPlacement: SnackPlacement;
  selectedTpl: FoodTemplateItem | null;
  mealInputMode: TemplateInputMode;
  tplAmount: string;
  name: string;
  calories: string;
  protein: string;
  carbohydrate: string;
  fat: string;
};

export function formatTplAmount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function defaultTplAmount(tpl: FoodTemplateItem, mode: TemplateInputMode): string {
  if (mode === 'TOTAL_GRAMS') return formatTplAmount(tpl.servingGrams) || '1';
  return '1';
}

export function tplAmountFromMeal(m: MealRow, tpl: FoodTemplateItem): string {
  const mode = m.mealInputMode === 'TOTAL_GRAMS' ? 'TOTAL_GRAMS' : 'PORTION_COUNT';
  if (mode === 'PORTION_COUNT' && m.portionQuantity != null) {
    return formatTplAmount(m.portionQuantity) || '1';
  }
  if (mode === 'TOTAL_GRAMS' && m.grams != null && m.grams > 0) {
    return formatTplAmount(m.grams);
  }
  return defaultTplAmount(tpl, mode);
}

export function unitHint(tpl: FoodTemplateItem): string {
  if (tpl.portionUnit === 'GRAM') return 'g';
  if (tpl.portionLabel) return tpl.portionLabel;
  if (tpl.portionUnit === 'PIECE') return '개';
  if (tpl.portionUnit === 'PLATE') return '접시';
  if (tpl.portionUnit === 'BOWL') return '공기';
  return '단위';
}

export function baselineSummary(tpl: FoodTemplateItem): string {
  if (tpl.portionUnit === 'GRAM') return `${tpl.referenceAmount}g`;
  return `${tpl.referenceAmount}${unitHint(tpl)}`;
}

export function hydrateFromMeal(meal: MealRow, templates: FoodTemplateItem[]): MealEditFormState {
  const base: MealEditFormState = {
    mealId: meal.mealId,
    consumedAt: meal.consumedAt,
    mealSlot: meal.mealSlot ?? 'LUNCH',
    snackPlacement: meal.snackPlacement ?? defaultSnackPlacementForNow(),
    selectedTpl: null,
    mealInputMode: 'PORTION_COUNT',
    tplAmount: '1',
    name: '',
    calories: '',
    protein: '',
    carbohydrate: '',
    fat: '',
  };

  if (meal.foodTemplateId) {
    const tpl = templates.find((x) => x.id === meal.foodTemplateId);
    if (tpl) {
      const mode = meal.mealInputMode === 'TOTAL_GRAMS' ? 'TOTAL_GRAMS' : 'PORTION_COUNT';
      return {
        ...base,
        mealSlot: meal.mealSlot ?? base.mealSlot,
        snackPlacement: meal.snackPlacement ?? base.snackPlacement,
        selectedTpl: tpl,
        mealInputMode: mode,
        tplAmount: tplAmountFromMeal(meal, tpl),
      };
    }
  }

  return {
    ...base,
    mealSlot: meal.mealSlot ?? base.mealSlot,
    snackPlacement: meal.snackPlacement ?? base.snackPlacement,
    name: meal.name,
    calories: String(Math.round(meal.calories)),
    protein: String(Math.round(meal.protein)),
    carbohydrate: String(Math.round(meal.carbohydrate)),
    fat: String(Math.round(meal.fat)),
  };
}

function mealBodyBase(state: MealEditFormState): Record<string, unknown> {
  const base: Record<string, unknown> = {
    mealSlot: state.mealSlot,
    consumedAt: state.consumedAt,
  };
  if (state.mealSlot === 'SNACK') {
    base.snackPlacement = state.snackPlacement;
  } else {
    base.snackPlacement = null;
  }
  return base;
}

export function buildUpdateBody(
  state: MealEditFormState,
  nameRequiredMessage: string,
  snackRequiredMessage: string,
): Record<string, unknown> {
  if (state.mealSlot === 'SNACK' && !state.snackPlacement) {
    throw new Error(snackRequiredMessage);
  }

  if (state.selectedTpl) {
    const amt = Number(String(state.tplAmount).replace(',', '.'));
    if (!Number.isFinite(amt) || amt <= 0) throw new Error('수량을 올바르게 입력해 주세요.');
    const body: Record<string, unknown> = {
      ...mealBodyBase(state),
      foodTemplateId: state.selectedTpl.id,
      mealInputMode: state.mealInputMode,
    };
    if (state.mealInputMode === 'PORTION_COUNT') {
      body.portionQuantity = amt;
    } else {
      body.totalGrams = amt;
    }
    return body;
  }

  if (!state.name.trim()) throw new Error(nameRequiredMessage);
  const nutrition = parseManualNutrition({
    calories: state.calories,
    protein: state.protein,
    carbohydrate: state.carbohydrate,
    fat: state.fat,
  });
  return {
    ...mealBodyBase(state),
    name: state.name.trim(),
    ...nutrition,
  };
}

export function previewTemplateKcal(
  tpl: FoodTemplateItem,
  mealInputMode: TemplateInputMode,
  tplAmount: string,
): number | null {
  const amt = Number(String(tplAmount).replace(',', '.'));
  if (!Number.isFinite(amt) || amt <= 0 || !(tpl.servingGrams > 0)) return null;
  const g = mealInputMode === 'PORTION_COUNT' ? amt * tpl.servingGrams : amt;
  const scale = g / tpl.servingGrams;
  return Math.round(tpl.calories * scale);
}
