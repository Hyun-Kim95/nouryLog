import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useDevToggles } from './dev/devToggles';
import { getThemeMode, setThemeModeStored } from './userPrefs';

export type ThemeMode = 'light' | 'dark';

export type ThemeColors = {
  bg: string;
  surface: string;
  surface2: string;
  fg: string;
  fgMuted: string;
  fgSubtle: string;
  border: string;
  /// 보더 강조 단계. 점선/구분선 등 `border`보다 한 단계 명확한 라인이 필요한 곳에 사용.
  borderStrong: string;
  primary: string;
  primaryFg: string;
  danger: string;
  dangerFg: string;
  /// 주의가 필요한 정보 톤(amber 계열). 권장 계산 v1.4 warnings 행, OS 권한 변경 안내 등 "위험은 아니지만 사용자가 인지해야 할 정보"에 사용한다. 강한 오류는 `danger`, 정보성은 `info`.
  warn: string;
  info: string;
  success: string;
};

const LIGHT: ThemeColors = {
  bg: '#ffffff',
  surface: '#ffffff',
  surface2: '#f8fafc',
  fg: '#0f172a',
  fgMuted: '#475569',
  fgSubtle: '#94a3b8',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  primary: '#16a34a',
  primaryFg: '#ffffff',
  danger: '#b91c1c',
  dangerFg: '#ffffff',
  warn: '#b45309',
  info: '#1d4ed8',
  success: '#15803d',
};

const DARK: ThemeColors = {
  bg: '#0b1220',
  surface: '#111827',
  surface2: '#1f2937',
  fg: '#f8fafc',
  fgMuted: '#cbd5e1',
  fgSubtle: '#94a3b8',
  border: '#334155',
  borderStrong: '#475569',
  primary: '#22c55e',
  primaryFg: '#052e16',
  danger: '#fca5a5',
  dangerFg: '#7f1d1d',
  warn: '#fcd34d',
  info: '#93c5fd',
  success: '#86efac',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
};

export const fontSize = {
  caption: 12,
  body: 14,
  bodyLg: 16,
  title: 20,
  display: 24,
};

export type Theme = {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
};

export type UserThemeModeApi = {
  userMode: ThemeMode;
  setUserMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<Theme | null>(null);
const UserThemeModeContext = createContext<UserThemeModeApi | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const { themeOverride } = useDevToggles();
  const seedMode: ThemeMode = scheme === 'dark' ? 'dark' : 'light';
  const [userMode, setUserModeState] = useState<ThemeMode>(seedMode);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const saved = await getThemeMode();
        if (cancelled) return;
        if (saved === 'light' || saved === 'dark') {
          setUserModeState(saved);
          return;
        }
        setUserModeState(seedMode);
        void setThemeModeStored(seedMode);
      } catch (e) {
        if (__DEV__) console.warn('[ThemeProvider] load theme failed', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [seedMode]);

  const setUserMode = useCallback((mode: ThemeMode) => {
    setUserModeState(mode);
    void setThemeModeStored(mode);
  }, []);

  const resolvedMode: ThemeMode =
    themeOverride === 'light'
      ? 'light'
      : themeOverride === 'dark'
        ? 'dark'
        : userMode;

  const value = useMemo<Theme>(
    () => ({
      mode: resolvedMode,
      colors: resolvedMode === 'dark' ? DARK : LIGHT,
      spacing,
      radius,
      fontSize,
    }),
    [resolvedMode],
  );

  const userApi = useMemo<UserThemeModeApi>(
    () => ({ userMode, setUserMode }),
    [userMode, setUserMode],
  );

  return (
    <UserThemeModeContext.Provider value={userApi}>
      <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    </UserThemeModeContext.Provider>
  );
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { mode: 'light', colors: LIGHT, spacing, radius, fontSize };
  }
  return ctx;
}

export function useUserThemeMode(): UserThemeModeApi {
  const ctx = useContext(UserThemeModeContext);
  if (!ctx) {
    return { userMode: 'light', setUserMode: () => {} };
  }
  return ctx;
}
