import type { Meal } from '@prisma/client';
import { formatMealSlotKo } from '../ai/aiStatsPeriod.js';

export function buildMealIndexContent(meal: Pick<
  Meal,
  'name' | 'note' | 'mealSlot' | 'protein' | 'calories' | 'carbohydrate' | 'fat' | 'consumedAt'
>): string {
  const date = meal.consumedAt.toISOString().slice(0, 10);
  const slot = formatMealSlotKo(meal.mealSlot);
  const parts = [
    meal.name,
    slot ? `끼니: ${slot}` : '',
    meal.note?.trim() ? `메모: ${meal.note.trim()}` : '',
    `날짜: ${date}`,
    `단백질 ${Math.round(meal.protein)}g`,
    `칼로리 ${Math.round(meal.calories)}kcal`,
    `탄수화물 ${Math.round(meal.carbohydrate)}g`,
    `지방 ${Math.round(meal.fat)}g`,
  ].filter(Boolean);
  return parts.join('\n');
}
