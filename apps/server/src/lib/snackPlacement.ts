import type { MealSlot, SnackPlacement } from '@prisma/client';

const SNACK_VALUES = new Set<SnackPlacement>([
  'BEFORE_BREAKFAST',
  'BETWEEN_BREAKFAST_LUNCH',
  'BETWEEN_LUNCH_DINNER',
  'AFTER_DINNER',
]);

export function parseSnackPlacement(raw: unknown): SnackPlacement | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === '') return null;
  const s = String(raw).toUpperCase();
  if (SNACK_VALUES.has(s as SnackPlacement)) return s as SnackPlacement;
  return null;
}

export function snackPlacementPatchFromBody(
  b: Record<string, unknown>,
): { ok: true; data: { snackPlacement?: SnackPlacement | null } } | { ok: false } {
  if (!Object.prototype.hasOwnProperty.call(b, 'snackPlacement')) {
    return { ok: true, data: {} };
  }
  if (b.snackPlacement === null) {
    return { ok: true, data: { snackPlacement: null } };
  }
  const parsed = parseSnackPlacement(b.snackPlacement);
  if (b.snackPlacement !== undefined && b.snackPlacement !== '' && parsed === null) {
    return { ok: false };
  }
  if (parsed === undefined) {
    return { ok: true, data: {} };
  }
  return { ok: true, data: { snackPlacement: parsed } };
}

export function validateMealSlotSnackCombo(
  mealSlot: MealSlot | null,
  snackPlacement: SnackPlacement | null,
): { ok: true } | { ok: false; field: string; message: string } {
  if (mealSlot === 'SNACK') {
    if (!snackPlacement) {
      return { ok: false, field: 'snackPlacement', message: '간식은 언제 드셨는지 선택해 주세요.' };
    }
    return { ok: true };
  }
  if (snackPlacement != null) {
    return { ok: false, field: 'snackPlacement', message: '간식 위치는 끼니가 간식일 때만 지정할 수 있습니다.' };
  }
  return { ok: true };
}
