export type ApiErrorBody = {
  code?: string;
  message?: string;
  details?: Record<string, unknown> | null;
  traceId?: string;
};

function looksLikeHtml(text: string): boolean {
  const t = text.trim();
  return t.startsWith('<') || /<!DOCTYPE/i.test(t);
}

export function sanitizeApiErrorMessage(text: string, status: number): string {
  const trimmed = text.trim();
  if (status === 413) {
    return '이미지가 너무 커요. 다른 사진을 선택하거나 해상도를 낮춰 주세요.';
  }
  if (looksLikeHtml(trimmed) || trimmed.length > 300) {
    return '서버 응답 형식이 올바르지 않아요. 잠시 후 다시 시도해 주세요.';
  }
  return trimmed;
}

export function parseApiErrorBody(status: number, text: string): ApiErrorBody {
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as ApiErrorBody;
    const rawMessage = typeof parsed.message === 'string' ? parsed.message : '';
    if (rawMessage && (looksLikeHtml(rawMessage) || rawMessage.length > 300)) {
      return { ...parsed, message: sanitizeApiErrorMessage(rawMessage, status) };
    }
    return parsed;
  } catch {
    return { message: sanitizeApiErrorMessage(text, status) };
  }
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly traceId?: string;

  constructor(status: number, body: ApiErrorBody) {
    const raw = body.message || `HTTP ${status}`;
    super(sanitizeApiErrorMessage(raw, status));
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
