import type { MealSlot } from '@prisma/client';

export type SlotKey = MealSlot | 'UNSPECIFIED';

export const SLOT_KEYS: SlotKey[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'UNSPECIFIED'];

/** 검색어 정규화: 앞뒤 공백 제거. nullish/비문자열은 빈 문자열. */
export function normalizeMealQuery(raw: unknown): string {
  if (raw === undefined || raw === null) return '';
  return String(raw).trim();
}

/**
 * 음식명 검색용 Prisma where 단편.
 * 빈 검색어면 빈 객체(필터 미적용)를 반환한다.
 */
export function mealNameWhere(q: string): { name: { contains: string; mode: 'insensitive' } } | Record<string, never> {
  if (!q) return {};
  return { name: { contains: q, mode: 'insensitive' } };
}

/** 5키(끼니+미분류) 0으로 초기화된 분포. */
export function emptySlotDistribution(): Record<SlotKey, number> {
  return { BREAKFAST: 0, LUNCH: 0, DINNER: 0, SNACK: 0, UNSPECIFIED: 0 };
}

/**
 * Prisma groupBy(mealSlot) 결과 → 끼니별 건수 분포.
 * mealSlot null은 UNSPECIFIED로 합산한다. 항상 5키를 모두 포함한다.
 */
export function slotDistributionFromGroups(
  groups: Array<{ mealSlot: MealSlot | null; count: number }>,
): Record<SlotKey, number> {
  const dist = emptySlotDistribution();
  for (const g of groups) {
    const key: SlotKey = g.mealSlot ?? 'UNSPECIFIED';
    dist[key] += g.count;
  }
  return dist;
}

/** 분포 전체 합(= 빈도). */
export function totalFromDistribution(dist: Record<SlotKey, number>): number {
  return SLOT_KEYS.reduce((sum, k) => sum + dist[k], 0);
}
