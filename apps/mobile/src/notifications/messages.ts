import type { MealKey } from '../notifPrefs';

/// PRD v0.2 §7 — 시점별 컨텍스트 (N3=b 결정).
const MEAL_CONTENT: Record<MealKey, { title: string; body: string }> = {
  breakfast: {
    title: '아침 기록 시간이에요',
    body: '오늘 아침 식단을 빠르게 남겨볼까요?',
  },
  lunch: {
    title: '점심 기록 시간이에요',
    body: '오늘 점심 식단을 빠르게 남겨볼까요?',
  },
  dinner: {
    title: '저녁 기록 시간이에요',
    body: '오늘 저녁 식단을 빠르게 남겨볼까요?',
  },
};

export function buildMealContent(meal: MealKey): { title: string; body: string } {
  return MEAL_CONTENT[meal];
}

/// PRD v0.2 §5.3 / §7 — N5a=c 둘 다 미달 판정.
/// 호출자: 부족량(>=0)을 g/kcal 단위로 전달. 둘 다 0(=충족)이면 null 반환 → 발송 안 함.
export type ShortfallContent = { title: string; body: string } | null;

export function buildNutritionContent(args: {
  proteinShortfallG: number;
  calorieShortfallKcal: number;
}): ShortfallContent {
  const p = Math.max(0, Math.round(args.proteinShortfallG));
  const c = Math.max(0, Math.round(args.calorieShortfallKcal));
  if (p === 0 && c === 0) return null;

  const title = '오늘 식단 점검';
  if (p > 0 && c > 0) {
    return { title, body: `오늘 단백질 약 ${p} g, 칼로리 약 ${c} kcal 부족해요. 식단을 점검해보세요.` };
  }
  if (p > 0) {
    return { title, body: `오늘 단백질이 약 ${p} g 부족해요. 한 끼 더 챙겨볼까요?` };
  }
  return { title, body: `오늘 칼로리가 약 ${c} kcal 부족해요. 가벼운 보충 식단을 고려해보세요.` };
}
