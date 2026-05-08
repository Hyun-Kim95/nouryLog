import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { SocialProvider } from '@prisma/client';
import { OAUTH_SERVER_BASE_URL, OAUTH_STATE_SECRET, socialProviderConfig } from './socialConfig.js';

type ProviderProfile = {
  providerUserId: string;
  email: string | null;
  name: string | null;
};

type ConflictPayload = {
  typ: 'social_conflict';
  provider: SocialProvider;
  providerUserId: string;
  email: string | null;
  name: string | null;
  iat?: number;
  exp?: number;
};

const STATE_TTL_SECONDS = 10 * 60;
const CONFLICT_TTL_SECONDS = 10 * 60;
const stateStore = new Map<string, { provider: SocialProvider; redirectUri: string; createdAt: number }>();

function now() {
  return Date.now();
}

function cleanupStateStore() {
  const expires = now() - STATE_TTL_SECONDS * 1000;
  for (const [key, value] of stateStore.entries()) {
    if (value.createdAt < expires) stateStore.delete(key);
  }
}

function mapProvider(provider: string): SocialProvider | null {
  if (provider === 'naver') return 'NAVER';
  if (provider === 'google') return 'GOOGLE';
  if (provider === 'kakao') return 'KAKAO';
  return null;
}

function providerLabel(provider: SocialProvider): 'naver' | 'google' | 'kakao' {
  if (provider === 'NAVER') return 'naver';
  if (provider === 'GOOGLE') return 'google';
  return 'kakao';
}

function createCallbackUrl(provider: SocialProvider) {
  return `${OAUTH_SERVER_BASE_URL}/auth/social/${providerLabel(provider)}/callback`;
}

export function parseSocialProvider(provider: string): SocialProvider | null {
  return mapProvider(provider);
}

export function createAuthorizationUrl(provider: SocialProvider, redirectUri: string): string | null {
  const cfg = socialProviderConfig(provider);
  if (!cfg) return null;
  cleanupStateStore();
  const state = crypto.randomBytes(24).toString('hex');
  stateStore.set(state, { provider, redirectUri, createdAt: now() });
  const callback = createCallbackUrl(provider);

  if (provider === 'GOOGLE') {
    const scope = encodeURIComponent('openid email profile');
    return `${cfg.authorizeUrl}?response_type=code&client_id=${encodeURIComponent(cfg.clientId)}&redirect_uri=${encodeURIComponent(callback)}&scope=${scope}&state=${encodeURIComponent(state)}&prompt=select_account`;
  }

  if (provider === 'NAVER') {
    return `${cfg.authorizeUrl}?response_type=code&client_id=${encodeURIComponent(cfg.clientId)}&redirect_uri=${encodeURIComponent(callback)}&state=${encodeURIComponent(state)}`;
  }

  return `${cfg.authorizeUrl}?response_type=code&client_id=${encodeURIComponent(cfg.clientId)}&redirect_uri=${encodeURIComponent(callback)}&state=${encodeURIComponent(state)}`;
}

export function consumeOAuthState(provider: SocialProvider, state: string): { redirectUri: string } | null {
  cleanupStateStore();
  const item = stateStore.get(state);
  if (!item || item.provider !== provider) return null;
  stateStore.delete(state);
  return { redirectUri: item.redirectUri };
}

async function exchangeCodeForToken(
  provider: SocialProvider,
  code: string,
  state?: string,
): Promise<{ accessToken: string } | null> {
  const cfg = socialProviderConfig(provider);
  if (!cfg) return null;
  const callback = createCallbackUrl(provider);
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    code,
    redirect_uri: callback,
  });

  if (provider === 'NAVER' && state) body.set('state', state);

  const res = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) return null;
  return { accessToken: json.access_token };
}

async function fetchGoogleProfile(accessToken: string): Promise<ProviderProfile | null> {
  const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { sub?: string; email?: string; name?: string };
  if (!json.sub) return null;
  return { providerUserId: json.sub, email: json.email ?? null, name: json.name ?? null };
}

async function fetchNaverProfile(accessToken: string): Promise<ProviderProfile | null> {
  const res = await fetch('https://openapi.naver.com/v1/nid/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { response?: { id?: string; email?: string; name?: string } };
  if (!json.response?.id) return null;
  return { providerUserId: json.response.id, email: json.response.email ?? null, name: json.response.name ?? null };
}

async function fetchKakaoProfile(accessToken: string): Promise<ProviderProfile | null> {
  const res = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { id?: number; kakao_account?: { email?: string; profile?: { nickname?: string } } };
  if (!json.id) return null;
  return {
    providerUserId: String(json.id),
    email: json.kakao_account?.email ?? null,
    name: json.kakao_account?.profile?.nickname ?? null,
  };
}

export async function fetchProviderProfile(
  provider: SocialProvider,
  code: string,
  state?: string,
): Promise<ProviderProfile | null> {
  const token = await exchangeCodeForToken(provider, code, state);
  if (!token) return null;
  if (provider === 'GOOGLE') return fetchGoogleProfile(token.accessToken);
  if (provider === 'NAVER') return fetchNaverProfile(token.accessToken);
  return fetchKakaoProfile(token.accessToken);
}

export function createConflictToken(payload: Omit<ConflictPayload, 'typ'>): string {
  return jwt.sign({ typ: 'social_conflict', ...payload }, OAUTH_STATE_SECRET, { expiresIn: CONFLICT_TTL_SECONDS });
}

export function verifyConflictToken(token: string): ConflictPayload | null {
  try {
    const decoded = jwt.verify(token, OAUTH_STATE_SECRET) as ConflictPayload;
    if (decoded.typ !== 'social_conflict') return null;
    return decoded;
  } catch {
    return null;
  }
}
