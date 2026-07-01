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
> & {
  kind?: string;
  calories?: number | null;
  protein?: number | null;
  carbohydrate?: number | null;
  fat?: number | null;
  grams?: number | null;
};

export type Macros = { protein: number; carbohydrate: number; fat: number };

/** 항목 분량 라벨 (예: "2개", "150g"). manual은 grams, 템플릿 없으면 모드 기반 근사. */
export function mealSetItemPortionLabel(item: MealSetItemPortionLike, tpl?: FoodTemplateItem): string {
  if (item.kind === 'manual') {
    return item.grams != null ? `${formatAmount(item.grams)}g` : '직접 입력';
  }
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

/** 항목 칼로리(정수) — manual은 스냅샷, template은 환산. 불가 시 null. */
export function mealSetItemKcal(item: MealSetItemPortionLike, tpl?: FoodTemplateItem): number | null {
  if (item.kind === 'manual') {
    return item.calories != null ? Math.round(item.calories) : null;
  }
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

/** 항목 탄단지(정수 g) — manual은 스냅샷, template은 환산. 불가 시 null. */
export function mealSetItemMacros(item: MealSetItemPortionLike, tpl?: FoodTemplateItem): Macros | null {
  if (item.kind === 'manual') {
    return {
      protein: Math.round(item.protein ?? 0),
      carbohydrate: Math.round(item.carbohydrate ?? 0),
      fat: Math.round(item.fat ?? 0),
    };
  }
  if (!tpl || !templateNutritionComplete(tpl)) return null;
  let totalGrams: number;
  if (item.mealInputMode === 'TOTAL_GRAMS') {
    if (item.totalGrams == null || item.totalGrams <= 0) return null;
    totalGrams = item.totalGrams;
  } else {
    if (item.portionQuantity == null || item.portionQuantity <= 0) return null;
    totalGrams = item.portionQuantity * tpl.servingGrams;
  }
  const scale = totalGrams / tpl.servingGrams;
  return {
    protein: Math.round(tpl.protein * scale),
    carbohydrate: Math.round(tpl.carbohydrate * scale),
    fat: Math.round(tpl.fat * scale),
  };
}

/** 탄단지 한 줄 라벨 (예: "탄 20 · 단 10 · 지 5 g"). */
export function macroLabel(m: Macros): string {
  return `탄 ${m.carbohydrate} · 단 ${m.protein} · 지 ${m.fat} g`;
}

/**
 * 클라이언트 측 항목 사용 가능 여부.
 * 활성 템플릿 목록에 없으면 사용 불가(서버는 MISSING/INACTIVE를 구분하나 화면에선 동일 처리).
 */
export function isMealSetItemUnavailable(item: MealSetItem, tpl?: FoodTemplateItem): boolean {
  if (item.kind === 'manual') return false;
  if (!item.foodTemplateId) return true;
  if (!tpl) return true;
  return !templateNutritionComplete(tpl);
}

export type MealSetSummary = {
  itemCount: number;
  totalKcal: number;
  totalMacros: Macros;
  hasUnavailable: boolean;
  /** 세트에 포함된 음식명 목록(표시 순서 유지). 사용 불가 항목은 '삭제된 음식'. */
  names: string[];
};

/** 세트 요약(항목 수, 합계 kcal·탄단지, 사용 불가 포함 여부, 음식명 목록). */
export function summarizeMealSet(
  set: MealSet,
  tplById: Map<string, FoodTemplateItem>,
): MealSetSummary {
  let totalKcal = 0;
  const totalMacros: Macros = { protein: 0, carbohydrate: 0, fat: 0 };
  let hasUnavailable = false;
  const names: string[] = [];
  for (const item of set.items) {
    const tpl = item.foodTemplateId ? tplById.get(item.foodTemplateId) : undefined;
    const baseName =
      item.kind === 'manual' ? (item.name ?? '직접 입력 음식') : (tpl?.name ?? '삭제된 음식');
    // 개수(인분)는 템플릿 항목의 portionQuantity로만 표시 가능(수기는 영양에 배수가 반영되어 별도 카운트 없음).
    const qty =
      item.kind !== 'manual' && item.mealInputMode === 'PORTION_COUNT' && item.portionQuantity != null
        ? Math.max(1, Math.round(item.portionQuantity))
        : 1;
    names.push(qty >= 2 ? `${baseName} ×${qty}` : baseName);
    if (isMealSetItemUnavailable(item, tpl)) {
      hasUnavailable = true;
      continue;
    }
    const kcal = mealSetItemKcal(item, tpl);
    if (kcal != null) totalKcal += kcal;
    const macros = mealSetItemMacros(item, tpl);
    if (macros) {
      totalMacros.protein += macros.protein;
      totalMacros.carbohydrate += macros.carbohydrate;
      totalMacros.fat += macros.fat;
    }
  }
  return { itemCount: set.items.length, totalKcal, totalMacros, hasUnavailable, names };
}
