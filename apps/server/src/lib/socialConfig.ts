import type { SocialProvider } from '@prisma/client';

export const OAUTH_SERVER_BASE_URL = String(process.env.OAUTH_SERVER_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
export const OAUTH_STATE_SECRET = String(process.env.OAUTH_STATE_SECRET ?? process.env.JWT_SECRET ?? 'dev-social-secret-change-me');

type SocialCfg = {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
};

const configMap: Record<SocialProvider, SocialCfg> = {
  NAVER: {
    clientId: String(process.env.NAVER_CLIENT_ID ?? '').trim(),
    clientSecret: String(process.env.NAVER_CLIENT_SECRET ?? '').trim(),
    authorizeUrl: 'https://nid.naver.com/oauth2.0/authorize',
    tokenUrl: 'https://nid.naver.com/oauth2.0/token',
  },
  GOOGLE: {
    clientId: String(process.env.GOOGLE_CLIENT_ID ?? '').trim(),
    clientSecret: String(process.env.GOOGLE_CLIENT_SECRET ?? '').trim(),
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
  },
  KAKAO: {
    clientId: String(process.env.KAKAO_CLIENT_ID ?? '').trim(),
    clientSecret: String(process.env.KAKAO_CLIENT_SECRET ?? '').trim(),
    authorizeUrl: 'https://kauth.kakao.com/oauth/authorize',
    tokenUrl: 'https://kauth.kakao.com/oauth/token',
  },
};

/// 카카오는 Client Secret을 콘솔에서 끈 경우 `client_secret` 파라미터를내면 안 되므로 ID만으로도 설정 반환.
export function socialProviderConfig(provider: SocialProvider): SocialCfg | null {
  const cfg = configMap[provider];
  if (!cfg.clientId) return null;
  if (provider === 'KAKAO') return cfg;
  if (!cfg.clientSecret) return null;
  return cfg;
}
