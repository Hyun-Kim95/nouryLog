import { API_BASE } from './config';
import { getRefreshToken, saveTokens } from './authStorage';
import { ApiError } from './lib/apiError';

let refreshInFlight: Promise<string | null> | null = null;

type RefreshResponse = { accessToken: string; refreshToken: string };

/** 저장된 refresh 토큰으로 access를 갱신한다. 실패 시 null. */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const refresh = await getRefreshToken();
      if (!refresh) return null;

      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });

      const text = await res.text();
      let json: unknown = {};
      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
          json = { message: text };
        }
      }

      if (!res.ok) return null;

      const body = json as RefreshResponse;
      if (!body.accessToken || !body.refreshToken) return null;

      await saveTokens(body.accessToken, body.refreshToken);
      return body.accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/** Bearer 토큰으로 호출했을 때 refresh 재시도가 가능한 401인지 */
export function shouldRetryWithRefresh(err: unknown, hadBearerToken: boolean): boolean {
  if (!hadBearerToken || !(err instanceof ApiError)) return false;
  if (err.status !== 401) return false;
  if (err.code === 'AUTH_FORBIDDEN') return false;
  return err.code === 'AUTH_TOKEN_EXPIRED' || err.code === 'AUTH_UNAUTHORIZED';
}

export function isRefreshPath(path: string): boolean {
  return path.includes('/auth/refresh');
}
