import { apiFetch, ApiError } from './api';
import { getAccessToken } from './authStorage';
import { isRefreshPath, refreshAccessToken, shouldRetryWithRefresh } from './authRefresh';

export async function apiFetchAuth<T>(
  path: string,
  init: RequestInit & { _authRetried?: boolean } = {},
): Promise<T> {
  const token = await getAccessToken();
  try {
    return await apiFetch<T>(path, { ...init, token });
  } catch (e) {
    const hadBearer = Boolean(token);
    if (!init._authRetried && !isRefreshPath(path) && shouldRetryWithRefresh(e, hadBearer)) {
      const next = await refreshAccessToken();
      if (next) {
        return apiFetchAuth<T>(path, { ...init, _authRetried: true });
      }
    }
    throw e;
  }
}

export { ApiError };
