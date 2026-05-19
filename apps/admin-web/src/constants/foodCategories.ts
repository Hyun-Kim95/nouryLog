/**
 * 음식 템플릿 카테고리 (관리자 필터·등록/수정 드로어 SSOT).
 * 서버 seed·마이그레이션 데이터와 동일 집합을 유지한다.
 */
export const FOOD_TEMPLATE_CATEGORIES = [
  '한식',
  '중식',
  '일식',
  '양식',
  '간식',
  '간편식',
  '외식',
  '주류',
  '음료',
] as const;

export type FoodTemplateCategory = (typeof FOOD_TEMPLATE_CATEGORIES)[number];

/** 수정 시 DB 에만 있는 레거시/커스텀 값도 선택 목록에 포함 */
export function foodCategorySelectOptions(existing?: string | null): string[] {
  const trimmed = existing?.trim();
  if (trimmed && !(FOOD_TEMPLATE_CATEGORIES as readonly string[]).includes(trimmed)) {
    return [...FOOD_TEMPLATE_CATEGORIES, trimmed];
  }
  return [...FOOD_TEMPLATE_CATEGORIES];
}
