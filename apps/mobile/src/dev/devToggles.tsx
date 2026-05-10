import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Dev-only 디버그 토글. 사용자 시각 점검(`docs/design/mobile-onboarding-spec.md` §9)을
 * 빠르게 수행하기 위해 시뮬레이터·실기기 dev 빌드에서만 사용하는 보조 상태다.
 *
 * 모든 사용처는 반드시 `__DEV__` 가드를 통해 비활성화되어야 한다.
 * Provider 자체도 `__DEV__`가 아닐 때는 children만 렌더하고 토글은 항상 false로 둔다.
 */

export type ThemeOverride = 'system' | 'light' | 'dark';

export type DevToggles = {
  force5xx: boolean;
  forceRecalcFail: boolean;
  themeOverride: ThemeOverride;
  onboardingResetTick: number;
};

export type DevTogglesApi = DevToggles & {
  setForce5xx: (v: boolean) => void;
  setForceRecalcFail: (v: boolean) => void;
  setThemeOverride: (v: ThemeOverride) => void;
  bumpOnboardingResetTick: () => void;
};

const noop = () => {};

const defaultValue: DevTogglesApi = {
  force5xx: false,
  forceRecalcFail: false,
  themeOverride: 'system',
  onboardingResetTick: 0,
  setForce5xx: noop,
  setForceRecalcFail: noop,
  setThemeOverride: noop,
  bumpOnboardingResetTick: noop,
};

const DevTogglesContext = createContext<DevTogglesApi>(defaultValue);

export function DevTogglesProvider({ children }: { children: ReactNode }) {
  const [force5xx, setForce5xx] = useState(false);
  const [forceRecalcFail, setForceRecalcFail] = useState(false);
  const [themeOverride, setThemeOverride] = useState<ThemeOverride>('system');
  const [onboardingResetTick, setTick] = useState(0);

  const bumpOnboardingResetTick = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  const value = useMemo<DevTogglesApi>(
    () => ({
      force5xx,
      forceRecalcFail,
      themeOverride,
      onboardingResetTick,
      setForce5xx,
      setForceRecalcFail,
      setThemeOverride,
      bumpOnboardingResetTick,
    }),
    [force5xx, forceRecalcFail, themeOverride, onboardingResetTick, bumpOnboardingResetTick],
  );

  return <DevTogglesContext.Provider value={value}>{children}</DevTogglesContext.Provider>;
}

export function useDevToggles(): DevTogglesApi {
  return useContext(DevTogglesContext);
}

export function isDevBuild(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}
