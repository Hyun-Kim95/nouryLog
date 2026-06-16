import jwt from 'jsonwebtoken';
import type { SocialProvider } from '@prisma/client';
import { OAUTH_STATE_SECRET } from './socialConfig.js';

export type ProviderProfile = {
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

const CONFLICT_TTL_SECONDS = 10 * 60;

function mapProvider(provider: string): SocialProvider | null {
  if (provider === 'naver') return 'NAVER';
  if (provider === 'google') return 'GOOGLE';
  if (provider === 'kakao') return 'KAKAO';
  return null;
}

export function parseSocialProvider(provider: string): SocialProvider | null {
  return mapProvider(provider);
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
  const raw = await res.text();
  let json: { resultcode?: string; response?: { id?: string; email?: string; name?: string } };
  try {
    json = JSON.parse(raw) as typeof json;
  } catch {
    return null;
  }
  /// HTTP 200이어도 resultcode가 '00'이 아니면 실패(미동의·API 미설정 등).
  if (!res.ok || json.resultcode !== '00' || !json.response?.id) {
    if (process.env.SOCIAL_OAUTH_DEBUG === '1' || process.env.NODE_ENV !== 'production') {
      console.warn(`[social-oauth] naver profile failed status=${res.status} resultcode=${json.resultcode} snippet=${raw.slice(0, 300)}`);
    }
    return null;
  }
  return { providerUserId: json.response.id, email: json.response.email ?? null, name: json.response.name ?? null };
}

async function fetchKakaoProfile(accessToken: string): Promise<ProviderProfile | null> {
  const res = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const raw = await res.text();
  let json: { id?: number; kakao_account?: { email?: string; profile?: { nickname?: string } } };
  try {
    json = JSON.parse(raw) as typeof json;
  } catch {
    return null;
  }
  if (!res.ok || json.id == null) {
    if (process.env.SOCIAL_OAUTH_DEBUG === '1' || process.env.NODE_ENV !== 'production') {
      console.warn(`[social-oauth] kakao profile failed status=${res.status} snippet=${raw.slice(0, 300)}`);
    }
    return null;
  }
  return {
    providerUserId: String(json.id),
    email: json.kakao_account?.email ?? null,
    name: json.kakao_account?.profile?.nickname ?? null,
  };
}

/// 구글 id_token(JWT) 을 Google tokeninfo 엔드포인트로 검증해 프로필을 얻는다.
/// 클라이언트 SDK(GoogleSignin)가 idToken 만 돌려주는 케이스에 대응한다.
async function verifyGoogleIdToken(idToken: string): Promise<ProviderProfile | null> {
  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = (await res.json()) as {
    sub?: string;
    aud?: string;
    email?: string;
    name?: string;
    email_verified?: string | boolean;
  };
  if (!json.sub) return null;
  const allowedAud = (process.env.GOOGLE_ALLOWED_AUDIENCES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  /// 환경 변수가 비어 있으면 aud 검증을 건너뛰지만(로컬 개발 편의) 운영에선 반드시 등록.
  if (allowedAud.length > 0 && json.aud && !allowedAud.includes(json.aud)) {
    if (process.env.SOCIAL_OAUTH_DEBUG === '1' || process.env.NODE_ENV !== 'production') {
      console.warn(`[social-oauth] google idToken aud mismatch aud=${json.aud}`);
    }
    return null;
  }
  return { providerUserId: json.sub, email: json.email ?? null, name: json.name ?? null };
}

/// 클라이언트(SDK)가 가지고 있는 provider 토큰으로 직접 프로필을 조회한다.
/// 네이티브 SDK 흐름(POST /auth/social/:provider/exchange) 전용.
export async function fetchProviderProfileFromTokens(
  provider: SocialProvider,
  tokens: { accessToken?: string; idToken?: string },
): Promise<ProviderProfile | null> {
  const accessToken = tokens.accessToken?.trim();
  const idToken = tokens.idToken?.trim();
  if (provider === 'GOOGLE') {
    if (idToken) {
      const fromId = await verifyGoogleIdToken(idToken);
      if (fromId) return fromId;
    }
    if (accessToken) return fetchGoogleProfile(accessToken);
    return null;
  }
  if (!accessToken) return null;
  if (provider === 'NAVER') return fetchNaverProfile(accessToken);
  return fetchKakaoProfile(accessToken);
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
