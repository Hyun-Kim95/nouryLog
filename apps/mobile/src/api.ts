import { API_BASE } from './config';
import { ApiError, type ApiErrorBody } from './lib/apiError';
import { handleAuthFailure } from './authSession';

export { ApiError, isAuthDenied } from './lib/apiError';

const DEFAULT_API_TIMEOUT_MS = 20_000;

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string; timeoutMs?: number } = {},
): Promise<T> {
  const { token, headers, timeoutMs = DEFAULT_API_TIMEOUT_MS, signal: externalSignal, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new ApiError(408, {
        code: 'TIMEOUT',
        message: '서버 응답이 지연되고 있어요. 네트워크를 확인한 뒤 다시 시도해 주세요.',
      });
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
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
    handleAuthFailure(err);
    throw err;
  }
  return json as T;
}

export type PolicyKind = 'terms' | 'privacy';
export type PolicyDocument = {
  kind: PolicyKind;
  body: string;
  version: number;
  publishedAt: string;
  updatedAt: string;
};
export type ConsentVersions = Record<PolicyKind, { version: number }>;

export async function getPolicyDocument(kind: PolicyKind): Promise<PolicyDocument> {
  return apiFetch<PolicyDocument>(`/public/policies/${kind}`);
}

export async function postConsents(
  token: string,
  body: {
    ageConfirmed: boolean;
    consents: ConsentVersions;
    source?: string;
  },
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/me/consents', {
    method: 'POST',
    token,
    body: JSON.stringify(body),
  });
}

export type SocialProvider = 'naver' | 'google' | 'kakao';

export type SocialExchangeRequest = {
  providerAccessToken?: string;
  idToken?: string;
  source?: string;
};

export type SocialExchangeSuccess = {
  result: 'success';
  accessToken: string;
  refreshToken: string;
  requiresConsent: boolean;
};
export type SocialExchangeConflict = {
  result: 'conflict';
  conflictToken: string;
  email: string;
};
export type SocialExchangeResponse = SocialExchangeSuccess | SocialExchangeConflict;

export async function socialExchangeRequest(
  provider: SocialProvider,
  body: SocialExchangeRequest,
): Promise<SocialExchangeResponse> {
  return apiFetch<SocialExchangeResponse>(`/auth/social/${provider}/exchange`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function socialResolveConflictRequest(
  conflictToken: string,
  action: 'link' | 'separate',
): Promise<{ accessToken: string; refreshToken: string; requiresConsent?: boolean }> {
  return apiFetch<{ accessToken: string; refreshToken: string; requiresConsent?: boolean }>('/auth/social/conflict/resolve', {
    method: 'POST',
    body: JSON.stringify({ conflictToken, action }),
  });
}
