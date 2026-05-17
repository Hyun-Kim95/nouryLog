import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { API_BASE, setAuthDeniedHandler } from './api';
import { isAdminToken } from './jwtRole';

const STORAGE_KEY = 'diet-admin-token';

type AuthCtx = {
  token: string | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

function readStoredToken(): string | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  if (!isAdminToken(stored)) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
  return stored;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readStoredToken());

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
  }, []);

  useEffect(() => {
    setAuthDeniedHandler(logout);
    return () => setAuthDeniedHandler(null);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json()) as { accessToken?: string; message?: string };
    if (!res.ok) throw new Error(data.message ?? '로그인 실패');
    const accessToken = data.accessToken;
    if (!accessToken) throw new Error('토큰 없음');
    if (!isAdminToken(accessToken)) {
      throw new Error('관리자 계정만 로그인할 수 있습니다.');
    }
    localStorage.setItem(STORAGE_KEY, accessToken);
    setToken(accessToken);
  }, []);

  const isAdmin = isAdminToken(token);

  const value = useMemo(() => ({ token, isAdmin, login, logout }), [token, isAdmin, login, logout]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('AuthProvider missing');
  return v;
}

export { isAdminToken } from './jwtRole';
