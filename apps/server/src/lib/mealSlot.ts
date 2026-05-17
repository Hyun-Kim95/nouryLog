import type { MealSlot } from '@prisma/client';

export function parseMealSlot(raw: unknown): MealSlot | null | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const s = String(raw).toUpperCase();
  if (s === 'BREAKFAST' || s === 'LUNCH' || s === 'DINNER' || s === 'SNACK') return s as MealSlot;
  return null;
}

/** PUT/PATCH body에서 mealSlot 갱신 필드 추출. invalid면 ok:false */
export function mealSlotPatchFromBody(
  b: Record<string, unknown>,
): { ok: true; data: { mealSlot?: MealSlot | null } } | { ok: false } {
  if (!Object.prototype.hasOwnProperty.call(b, 'mealSlot')) {
    return { ok: true, data: {} };
  }
  if (b.mealSlot === null) {
    return { ok: true, data: { mealSlot: null } };
  }
  const slotParsed = parseMealSlot(b.mealSlot);
  if (b.mealSlot !== undefined && b.mealSlot !== '' && slotParsed === null) {
    return { ok: false };
  }
  if (slotParsed === undefined) {
    return { ok: true, data: {} };
  }
  return { ok: true, data: { mealSlot: slotParsed } };
}
