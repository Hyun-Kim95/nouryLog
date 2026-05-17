import { apiFetch } from '../api';
import { getProfile } from '../api/profile';

type MealRow = {
  consumedAt: string;
  protein?: number | null;
  calories?: number | null;
};

/// PRD v0.2 §5.3 — 권장량 미달 판정용 데이터 페치.
/// 본 Phase는 expo-background-fetch 미도입(단순화). 호출 시점(앱 포그라운드 진입 / 토글 ON / 시간 변경 등)
/// 에 1페이지 100건을 가져와 오늘 누적을 계산한다. 하루 식사 ≤ 100건 가정 — 일반 사용자 패턴 충분.
export async function fetchTodayShortfall(token: string): Promise<{
  proteinShortfallG: number;
  calorieShortfallKcal: number;
  proteinGoalG: number | null;
  calorieGoalKcal: number | null;
} | null> {
  const profile = await getProfile(token);
  const proteinGoalG = profile.proteinGoalG ?? null;
  const proteinThreshold = profile.proteinGoalMinG ?? proteinGoalG;
  const calorieGoalKcal = profile.calorieGoalKcal ?? null;
  const calorieThreshold = profile.calorieGoalMinKcal ?? calorieGoalKcal;
  if (!proteinThreshold || !calorieThreshold) {
    return { proteinShortfallG: 0, calorieShortfallKcal: 0, proteinGoalG, calorieGoalKcal };
  }

  const res = await apiFetch<{ items: MealRow[] }>('/meals?page=1&size=100', { token });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  let proteinSum = 0;
  let calorieSum = 0;
  for (const m of res.items ?? []) {
    const t = new Date(m.consumedAt).getTime();
    if (t >= todayStart.getTime() && t <= todayEnd.getTime()) {
      proteinSum += Number(m.protein ?? 0);
      calorieSum += Number(m.calories ?? 0);
    }
  }

  return {
    proteinShortfallG: Math.max(0, proteinThreshold - proteinSum),
    calorieShortfallKcal: Math.max(0, calorieThreshold - calorieSum),
    proteinGoalG,
    calorieGoalKcal,
  };
}
