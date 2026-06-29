import type { FoodTemplateItem } from '../api/meals';
import type { MealSet, MealSetItem } from '../api/mealSets';

/** 템플릿 단위 표기 (LogScreen unitHint와 동일 규칙). */
export function templateUnitHint(tpl: FoodTemplateItem): string {
  if (tpl.portionUnit === 'GRAM') return 'g';
  if (tpl.portionLabel) return tpl.portionLabel;
  if (tpl.portionUnit === 'PIECE') return '개';
  if (tpl.portionUnit === 'PLATE') return '접시';
  if (tpl.portionUnit === 'BOWL') return '공기';
  return '단위';
}

function formatAmount(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

/** 분량·칼로리 계산에 필요한 항목 필드만 추린 구조 타입 (서버 항목·로컬 드래프트 공용). */
export type MealSetItemPortionLike = Pick<
  MealSetItem,
  'mealInputMode' | 'portionQuantity' | 'totalGrams'
>;

/** 항목 분량 라벨 (예: "2개", "150g"). 템플릿 없으면 모드 기반 근사. */
export function mealSetItemPortionLabel(item: MealSetItemPortionLike, tpl?: FoodTemplateItem): string {
  if (item.mealInputMode === 'TOTAL_GRAMS') {
    return item.totalGrams != null ? `${formatAmount(item.totalGrams)}g` : '';
  }
  const qty = item.portionQuantity != null ? formatAmount(item.portionQuantity) : '1';
  return tpl ? `${qty}${templateUnitHint(tpl)}` : `${qty}개`;
}

function templateNutritionComplete(tpl: FoodTemplateItem): boolean {
  return (
    tpl.servingGrams != null &&
    tpl.servingGrams > 0 &&
    tpl.calories != null &&
    tpl.protein != null &&
    tpl.fat != null &&
    tpl.carbohydrate != null
  );
}

/** 항목 칼로리(정수) — 템플릿 기준 환산. 환산 불가 시 null. */
export function mealSetItemKcal(item: MealSetItemPortionLike, tpl?: FoodTemplateItem): number | null {
  if (!tpl || !templateNutritionComplete(tpl)) return null;
  let totalGrams: number;
  if (item.mealInputMode === 'TOTAL_GRAMS') {
    if (item.totalGrams == null || item.totalGrams <= 0) return null;
    totalGrams = item.totalGrams;
  } else {
    if (item.portionQuantity == null || item.portionQuantity <= 0) return null;
    totalGrams = item.portionQuantity * tpl.servingGrams;
  }
  return Math.round((tpl.calories * totalGrams) / tpl.servingGrams);
}

/**
 * 클라이언트 측 항목 사용 가능 여부.
 * 활성 템플릿 목록에 없으면 사용 불가(서버는 MISSING/INACTIVE를 구분하나 화면에선 동일 처리).
 */
export function isMealSetItemUnavailable(item: MealSetItem, tpl?: FoodTemplateItem): boolean {
  if (!item.foodTemplateId) return true;
  if (!tpl) return true;
  return !templateNutritionComplete(tpl);
}

export type MealSetSummary = {
  itemCount: number;
  totalKcal: number;
  hasUnavailable: boolean;
};

/** 세트 요약(항목 수, 합계 kcal, 사용 불가 포함 여부). */
export function summarizeMealSet(
  set: MealSet,
  tplById: Map<string, FoodTemplateItem>,
): MealSetSummary {
  let totalKcal = 0;
  let hasUnavailable = false;
  for (const item of set.items) {
    const tpl = item.foodTemplateId ? tplById.get(item.foodTemplateId) : undefined;
    if (isMealSetItemUnavailable(item, tpl)) {
      hasUnavailable = true;
      continue;
    }
    const kcal = mealSetItemKcal(item, tpl);
    if (kcal != null) totalKcal += kcal;
  }
  return { itemCount: set.items.length, totalKcal, hasUnavailable };
}
