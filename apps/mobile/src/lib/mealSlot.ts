export type MealSlot = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export type SnackPlacement =
  | 'BEFORE_BREAKFAST'
  | 'BETWEEN_BREAKFAST_LUNCH'
  | 'BETWEEN_LUNCH_DINNER'
  | 'AFTER_DINNER';

export const MEAL_SLOT_OPTIONS: { value: MealSlot; label: string }[] = [
  { value: 'BREAKFAST', label: '아침' },
  { value: 'LUNCH', label: '점심' },
  { value: 'DINNER', label: '저녁' },
  { value: 'SNACK', label: '간식' },
];

export const SNACK_PLACEMENT_OPTIONS: { value: SnackPlacement; label: string }[] = [
  { value: 'BEFORE_BREAKFAST', label: '아침 전' },
  { value: 'BETWEEN_BREAKFAST_LUNCH', label: '아침·점심 사이' },
  { value: 'BETWEEN_LUNCH_DINNER', label: '점심·저녁 사이' },
  { value: 'AFTER_DINNER', label: '저녁 후' },
];

export function defaultMealSlotForNow(date = new Date()): MealSlot {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'BREAKFAST';
  if (h >= 11 && h < 15) return 'LUNCH';
  if (h >= 15 && h < 22) return 'DINNER';
  return 'SNACK';
}

export function defaultSnackPlacementForNow(): SnackPlacement {
  const slot = defaultMealSlotForNow();
  if (slot === 'BREAKFAST') return 'BEFORE_BREAKFAST';
  if (slot === 'LUNCH') return 'BETWEEN_BREAKFAST_LUNCH';
  if (slot === 'DINNER') return 'BETWEEN_LUNCH_DINNER';
  return 'AFTER_DINNER';
}

export function mealSlotLabel(slot: MealSlot | null | undefined): string {
  if (!slot) return '미분류';
  return MEAL_SLOT_OPTIONS.find((o) => o.value === slot)?.label ?? slot;
}

export function snackPlacementLabel(placement: SnackPlacement | null | undefined): string {
  if (!placement) return '';
  return SNACK_PLACEMENT_OPTIONS.find((o) => o.value === placement)?.label ?? placement;
}
