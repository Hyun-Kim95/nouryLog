export type MealSlot = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export const MEAL_SLOT_OPTIONS: { value: MealSlot; label: string }[] = [
  { value: 'BREAKFAST', label: '아침' },
  { value: 'LUNCH', label: '점심' },
  { value: 'DINNER', label: '저녁' },
  { value: 'SNACK', label: '추가' },
];

export function defaultMealSlotForNow(date = new Date()): MealSlot {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'BREAKFAST';
  if (h >= 11 && h < 15) return 'LUNCH';
  if (h >= 15 && h < 22) return 'DINNER';
  return 'SNACK';
}

export function mealSlotLabel(slot: MealSlot | null | undefined): string {
  if (!slot) return '미분류';
  return MEAL_SLOT_OPTIONS.find((o) => o.value === slot)?.label ?? slot;
}
