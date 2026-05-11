import { API_BASE } from './config';

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
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const msg = (json as { message?: string }).message ?? res.statusText;
    throw new Error(msg);
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

export async function socialStartRequest(provider: SocialProvider, redirectUri: string): Promise<{ authorizationUrl: string }> {
  return apiFetch<{ authorizationUrl: string }>(`/auth/social/${provider}/start`, {
    method: 'POST',
    body: JSON.stringify({ redirectUri }),
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
