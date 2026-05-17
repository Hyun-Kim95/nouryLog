import { getProfile } from '../api/profile';
import { getOnboardingDone, parseUserIdFromAccessToken, rememberUserId, setOnboardingDone } from '../authStorage';

/** 로그인·콜드스타트 시 온보딩 생략 여부 (완료 플래그 또는 서버 권장 목표 존재). */
export async function resolveOnboardingComplete(accessToken: string): Promise<boolean> {
  const userId = parseUserIdFromAccessToken(accessToken);
  if (userId) await rememberUserId(userId);

  if (await getOnboardingDone(userId ?? undefined)) return true;

  try {
    const profile = await getProfile(accessToken);
    if (profile.calorieGoalKcal != null || profile.proteinGoalG != null) {
      if (userId) await setOnboardingDone(true, userId);
      return true;
    }
  } catch {
    /* 404 등 — 온보딩 필요 */
  }
  return false;
}
