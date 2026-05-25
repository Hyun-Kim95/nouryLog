import { refreshAccessToken } from '../authRefresh';
import { getProfile } from '../api/profile';
import { isAuthDenied } from './apiError';

const SESSION_PROBE_MS = 8_000;

/** 만료·무효 토큰이면 false. 네트워크·타임아웃은 true(화면에서 재시도). */
export async function isAccessTokenValid(token: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SESSION_PROBE_MS);
  try {
    await getProfile(token, { signal: controller.signal });
    return true;
  } catch (e) {
    if (isAuthDenied(e)) {
      const refreshed = await refreshAccessToken();
      return refreshed != null;
    }
    return true;
  } finally {
    clearTimeout(timer);
  }
}
