export type MealSlot = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

const LABELS: Record<MealSlot | 'UNSPECIFIED', string> = {
  BREAKFAST: '아침',
  LUNCH: '점심',
  DINNER: '저녁',
  SNACK: '간식',
  UNSPECIFIED: '미분류',
};

export function mealSlotLabel(slot: string | null | undefined): string {
  if (!slot) return LABELS.UNSPECIFIED;
  return LABELS[slot as MealSlot] ?? slot;
}
