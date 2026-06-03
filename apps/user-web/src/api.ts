export const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  traceId: string;
};

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly traceId?: string;
  readonly details?: Record<string, unknown>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message || `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code || 'UNKNOWN';
    this.traceId = body.traceId;
    this.details = body.details;
  }
}

export function isAuthDenied(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    (err.code === 'AUTH_FORBIDDEN' ||
      err.code === 'AUTH_UNAUTHORIZED' ||
      err.code === 'AUTH_TOKEN_EXPIRED' ||
      err.status === 401)
  );
}

let authDeniedHandler: (() => void) | null = null;

export function setAuthDeniedHandler(handler: (() => void) | null) {
  authDeniedHandler = handler;
}

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
  let json: unknown = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { message: text };
    }
  }
  if (!res.ok) {
    const err = new ApiError(res.status, (json ?? {}) as ApiErrorBody);
    if (isAuthDenied(err)) authDeniedHandler?.();
    throw err;
  }
  return json as T;
}
