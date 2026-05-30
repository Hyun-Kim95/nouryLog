import { API_BASE } from './config';
import { refreshAccessToken, isRefreshPath, shouldRetryWithRefresh } from './authRefresh';
import { ERRORS_COPY } from './copy/errors';
import { ApiError, parseApiErrorBody } from './lib/apiError';
import { handleAuthFailure } from './authSession';

export { ApiError, isAuthDenied, isRequestAborted } from './lib/apiError';

const DEFAULT_API_TIMEOUT_MS = 20_000;

export type ApiFetchAuthFailure = 'signOut' | 'silent';

export async function apiFetch<T>(
  path: string,
  init: RequestInit & {
    token?: string;
    timeoutMs?: number;
    _authRetried?: boolean;
    onAuthFailure?: ApiFetchAuthFailure;
  } = {},
): Promise<T> {
  const {
    token,
    headers,
    timeoutMs = DEFAULT_API_TIMEOUT_MS,
    signal: externalSignal,
    _authRetried = false,
    onAuthFailure = 'signOut',
    ...rest
  } = init;
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
      if (externalSignal?.aborted) {
        throw e;
      }
      throw new ApiError(408, {
        code: 'TIMEOUT',
        message: '서버 응답이 지연되고 있어요. 네트워크를 확인한 뒤 다시 시도해 주세요.',
      });
    }
    throw new ApiError(0, {
      code: 'NETWORK_UNAVAILABLE',
      message: ERRORS_COPY.network,
    });
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  const json = text ? parseApiErrorBody(res.status, text) : {};
  if (!res.ok) {
    const err = new ApiError(res.status, json);
    const hadBearer = Boolean(token);
    if (
      !_authRetried &&
      !isRefreshPath(path) &&
      shouldRetryWithRefresh(err, hadBearer)
    ) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return apiFetch<T>(path, { ...init, token: newToken, _authRetried: true });
      }
    }
    if (hadBearer && onAuthFailure === 'signOut') handleAuthFailure(err);
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

export async function deactivateAccount(
  token: string,
  body: { reasonCode: string; reasonText?: string },
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/me/deactivate', {
    method: 'PATCH',
    token,
    body: JSON.stringify(body),
  });
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
