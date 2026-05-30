import { contextFallback, ERRORS_COPY, type ErrorContext } from '../copy/errors';
import { ApiError } from './apiError';

const HANGUL_RE = /[\uAC00-\uD7A3]/;
const MAX_USER_MESSAGE_LEN = 200;

const TECHNICAL_PATTERNS: RegExp[] = [
  /network request failed/i,
  /exponentimagepicker/i,
  /\brejected\b/i,
  /launchimagelibrary/i,
  /launchcamera/i,
  /\bhttp\s*\d{3}\b/i,
  /\brailway\b/i,
  /api_key/i,
  /api key/i,
  /permission_denied/i,
  /typeerror/i,
  /undefined is not/i,
  /cannot read propert/i,
  /native module/i,
  /\[dev\]/i,
  /stack/i,
  /at\s+\w+\./,
];

export function isUserSafeMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > MAX_USER_MESSAGE_LEN) return false;
  if (!HANGUL_RE.test(trimmed)) return false;
  return !TECHNICAL_PATTERNS.some((re) => re.test(trimmed));
}

function isTechnicalMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return true;
  if (!HANGUL_RE.test(trimmed)) return true;
  return TECHNICAL_PATTERNS.some((re) => re.test(trimmed));
}

function messageFromApiError(err: ApiError, context: ErrorContext): string {
  switch (err.code) {
    case 'TIMEOUT':
    case 'NETWORK_UNAVAILABLE':
      return ERRORS_COPY.network;
    case 'OCR_FREE_QUOTA_EXCEEDED':
      return ERRORS_COPY.ocrQuota;
    case 'OCR_RATE_LIMIT':
      return ERRORS_COPY.ocrRateLimit;
    case 'OCR_PARSE_FAILED':
      return ERRORS_COPY.ocrParseFailed;
    case 'OCR_PROVIDER_UNAVAILABLE':
      return ERRORS_COPY.ocrUnavailable;
    case 'PAYMENT_REQUIRED':
      return ERRORS_COPY.billing;
    case 'BILLING_NOT_AVAILABLE':
      return ERRORS_COPY.billingUnavailable;
    case 'VALIDATION_FAILED':
      if (isUserSafeMessage(err.message)) return err.message;
      return contextFallback(context);
    default:
      if (err.status === 408) return ERRORS_COPY.timeout;
      if (err.status === 413) {
        return '이미지가 너무 커요. 다른 사진을 선택하거나 해상도를 낮춰 주세요.';
      }
      if (err.status >= 500) return contextFallback(context);
      if (isUserSafeMessage(err.message)) return err.message;
      return contextFallback(context);
  }
}

type ProfileApiErrorLike = Error & {
  name: 'ProfileApiError';
  status: number;
  code: string;
  field: string | null;
};

function isProfileApiError(err: unknown): err is ProfileApiErrorLike {
  return (
    err instanceof Error &&
    err.name === 'ProfileApiError' &&
    'status' in err &&
    typeof (err as ProfileApiErrorLike).status === 'number'
  );
}

function messageFromProfileApiError(err: ProfileApiErrorLike): string {
  if (err.status === 422 && err.field && isUserSafeMessage(err.message)) {
    return err.message;
  }
  if (isUserSafeMessage(err.message) && !isTechnicalMessage(err.message)) {
    return err.message;
  }
  return ERRORS_COPY.profile;
}

export function logAppError(
  tag: string,
  err: unknown,
  extra?: Record<string, unknown>,
): void {
  const payload: Record<string, unknown> = { ...extra };
  if (err instanceof ApiError) {
    payload.status = err.status;
    payload.code = err.code;
    payload.traceId = err.traceId;
    payload.message = err.message;
  } else if (isProfileApiError(err)) {
    payload.status = err.status;
    payload.code = err.code;
    payload.field = err.field;
    payload.message = err.message;
  } else if (err instanceof Error) {
    payload.name = err.name;
    payload.message = err.message;
  } else {
    payload.err = err;
  }
  console.warn(tag, payload);
}

export function toUserMessage(
  err: unknown,
  opts: { context: ErrorContext; fallback?: string },
): string {
  const fallback = opts.fallback ?? contextFallback(opts.context);

  if (isProfileApiError(err)) {
    return messageFromProfileApiError(err);
  }

  if (err instanceof ApiError) {
    return messageFromApiError(err, opts.context);
  }

  if (err instanceof Error) {
    if (isUserSafeMessage(err.message)) return err.message;
    if (isTechnicalMessage(err.message)) {
      if (/timeout/i.test(err.message) || err.name === 'AbortError') {
        return ERRORS_COPY.timeout;
      }
      if (/network/i.test(err.message)) return ERRORS_COPY.network;
      return fallback;
    }
    return fallback;
  }

  return fallback;
}
