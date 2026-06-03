import { API_BASE } from './api';
import { getRefreshToken, saveTokens } from './authStorage';
import { ApiError } from './api';

let refreshInFlight: Promise<string | null> | null = null;

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
      let json: { accessToken?: string; refreshToken?: string } = {};
      if (text) json = JSON.parse(text) as typeof json;
      if (!res.ok || !json.accessToken || !json.refreshToken) return null;
      await saveTokens(json.accessToken, json.refreshToken);
      return json.accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export function shouldRetryWithRefresh(err: unknown, hadBearer: boolean): boolean {
  if (!hadBearer || !(err instanceof ApiError)) return false;
  if (err.status !== 401 || err.code === 'AUTH_FORBIDDEN') return false;
  return err.code === 'AUTH_TOKEN_EXPIRED' || err.code === 'AUTH_UNAUTHORIZED';
}

export function isRefreshPath(path: string): boolean {
  return path.includes('/auth/refresh');
}
