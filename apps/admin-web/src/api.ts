/** Vite 프록시 기본값: `/api` → 서버 루트 */
export const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');

export type ApiErrorBody = { code: string; message: string; details?: Record<string, unknown>; traceId: string };

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = json as ApiErrorBody;
    throw new Error(err.message || res.statusText);
  }
  return json as T;
}
