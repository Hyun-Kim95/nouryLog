import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { API_BASE, setAuthDeniedHandler } from './api';
import { clearTokens, getAccessToken, saveTokens } from './authStorage';
import { clearAuthMode, getAuthMode, setAuthMode, type AuthMode } from './lib/authMode';

type SocialProviderSlug = 'google' | 'kakao' | 'naver';

type AuthCtx = {
  token: string | null;
  ready: boolean;
  authMode: AuthMode | null;
  loginEmail: (email: string, password: string, mode?: AuthMode) => Promise<void>;
  loginGoogleIdToken: (idToken: string) => Promise<void>;
  loginSocialAccessToken: (provider: 'kakao' | 'naver', accessToken: string) => Promise<void>;
  loginNaverCode: (code: string, redirectUri: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

async function applySocialTokens(data: {
  result?: string;
  accessToken?: string;
  refreshToken?: string;
  message?: string;
  email?: string;
}): Promise<void> {
  if (data.result === 'conflict') {
    throw new Error('이미 연결된 계정이 있습니다. 모바일 앱에서 계정을 확인해 주세요.');
  }
  if (!data.accessToken || !data.refreshToken) throw new Error(data.message ?? '토큰 없음');
  await saveTokens(data.accessToken, data.refreshToken);
  setAuthMode('social');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [authMode, setAuthModeState] = useState<AuthMode | null>(() => getAuthMode());

  useEffect(() => {
    void getAccessToken().then((t) => {
      setToken(t);
      setReady(true);
      if (t && !getAuthMode()) setAuthModeState(null);
    });
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    clearAuthMode();
    setToken(null);
    setAuthModeState(null);
  }, []);

  useEffect(() => {
    setAuthDeniedHandler(logout);
    return () => setAuthDeniedHandler(null);
  }, [logout]);

  const loginEmail = useCallback(async (email: string, password: string, mode: AuthMode = 'demo') => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json()) as { accessToken?: string; refreshToken?: string; message?: string };
    if (!res.ok) throw new Error(data.message ?? '로그인 실패');
    if (!data.accessToken || !data.refreshToken) throw new Error('토큰 없음');
    await saveTokens(data.accessToken, data.refreshToken);
    setAuthMode(mode);
    setAuthModeState(mode);
    setToken(data.accessToken);
  }, []);

  const exchangeSocial = useCallback(async (provider: SocialProviderSlug, body: Record<string, string>) => {
    const res = await fetch(`${API_BASE}/auth/social/${provider}/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, source: 'web' }),
    });
    const data = (await res.json()) as {
      result?: string;
      accessToken?: string;
      refreshToken?: string;
      message?: string;
    };
    if (!res.ok) throw new Error(data.message ?? 'SNS 로그인 실패');
    await applySocialTokens(data);
    setToken((await getAccessToken()) ?? null);
    setAuthModeState('social');
  }, []);

  const loginGoogleIdToken = useCallback(
    async (idToken: string) => {
      await exchangeSocial('google', { idToken });
    },
    [exchangeSocial],
  );

  const loginSocialAccessToken = useCallback(
    async (provider: 'kakao' | 'naver', accessToken: string) => {
      await exchangeSocial(provider, { providerAccessToken: accessToken });
    },
    [exchangeSocial],
  );

  const loginNaverCode = useCallback(async (code: string, redirectUri: string) => {
    const res = await fetch(`${API_BASE}/auth/social/naver/code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri }),
    });
    const data = (await res.json()) as {
      result?: string;
      accessToken?: string;
      refreshToken?: string;
      message?: string;
    };
    if (!res.ok) throw new Error(data.message ?? '네이버 로그인 실패');
    await applySocialTokens(data);
    setToken((await getAccessToken()) ?? null);
    setAuthModeState('social');
  }, []);

  const value = useMemo(
    () => ({
      token,
      ready,
      authMode,
      loginEmail,
      loginGoogleIdToken,
      loginSocialAccessToken,
      loginNaverCode,
      logout,
    }),
    [token, ready, authMode, loginEmail, loginGoogleIdToken, loginSocialAccessToken, loginNaverCode, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('AuthProvider missing');
  return v;
}
