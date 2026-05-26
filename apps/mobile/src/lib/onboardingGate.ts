import { getProfile } from '../api/profile';
import { getOnboardingDone, parseUserIdFromAccessToken, rememberUserId, setOnboardingDone } from '../authStorage';

const PROFILE_PROBE_MS = 8_000;

async function profileHasGoals(accessToken: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROFILE_PROBE_MS);
  try {
    const profile = await getProfile(accessToken, { signal: controller.signal });
    return (
      profile.calorieGoalKcal != null ||
      profile.proteinGoalG != null ||
      profile.carbohydrateGoalG != null ||
      profile.fatGoalG != null
    );
  } finally {
    clearTimeout(timer);
  }
}

/** 로그인·콜드스타트 시 온보딩 생략 여부 (완료 플래그 또는 서버 권장 목표 존재). */
export async function resolveOnboardingComplete(accessToken: string): Promise<boolean> {
  const userId = parseUserIdFromAccessToken(accessToken);
  if (userId) {
    try {
      await rememberUserId(userId);
    } catch (e) {
      if (__DEV__) console.warn('[onboardingGate] rememberUserId failed', e);
    }
  }

  try {
    if (await getOnboardingDone(userId ?? undefined)) return true;
  } catch (e) {
    if (__DEV__) console.warn('[onboardingGate] getOnboardingDone failed', e);
  }

  try {
    if (await profileHasGoals(accessToken)) {
      if (userId) {
        try {
          await setOnboardingDone(true, userId);
        } catch (e) {
          if (__DEV__) console.warn('[onboardingGate] setOnboardingDone failed', e);
        }
      }
      return true;
    }
  } catch {
    /* 404·네트워크·타임아웃 — 온보딩 필요 */
  }
  return false;
}
