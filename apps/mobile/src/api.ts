import { API_BASE } from './config';
import { ApiError, type ApiErrorBody } from './lib/apiError';
import { handleAuthFailure } from './authSession';

export { ApiError, isAuthDenied } from './lib/apiError';

export async function apiFetch<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, headers, ...rest } = init;
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
    handleAuthFailure(err);
    throw err;
  }
  return json as T;
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as { accessToken?: string; refreshToken?: string; message?: string };
  if (!res.ok) throw new Error(data.message ?? '로그인 실패');
  if (!data.accessToken || !data.refreshToken) throw new Error('토큰 응답 없음');
  return { accessToken: data.accessToken, refreshToken: data.refreshToken };
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

export async function signupRequest(body: {
  email: string;
  password: string;
  ageConfirmed: boolean;
  consents: ConsentVersions;
}): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

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
