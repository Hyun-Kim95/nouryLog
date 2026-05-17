export type ApiErrorBody = {
  code?: string;
  message?: string;
  details?: Record<string, unknown> | null;
  traceId?: string;
};

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly traceId?: string;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message || `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code ?? 'UNKNOWN';
    this.traceId = body.traceId;
  }
}

export function isAuthDenied(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const status = 'status' in err ? Number((err as { status: unknown }).status) : NaN;
  const code = 'code' in err ? String((err as { code: unknown }).code) : '';
  if (status === 401 || status === 403) return true;
  return (
    code === 'AUTH_UNAUTHORIZED' ||
    code === 'AUTH_TOKEN_EXPIRED' ||
    code === 'AUTH_FORBIDDEN'
  );
}
