import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, isAuthDenied } from '../api';
import { ensureAccessToken } from '../authSession';

type AdsStatus = { showBottomBanner: boolean; reason: string };

type AdsGateContextValue = {
  showBottomBanner: boolean;
  refresh: () => Promise<void>;
};

const AdsGateContext = createContext<AdsGateContextValue | null>(null);

export function AdsGateProvider({ children }: { children: ReactNode }) {
  const [showBottomBanner, setShowBottomBanner] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const token = await ensureAccessToken();
      if (!token) {
        setShowBottomBanner(false);
        return;
      }
      const ads = await apiFetch<AdsStatus>('/me/ads/status', { token });
      setShowBottomBanner(ads.showBottomBanner);
    } catch (e) {
      if (isAuthDenied(e)) {
        setShowBottomBanner(false);
        return;
      }
      setShowBottomBanner(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ showBottomBanner, refresh }), [showBottomBanner, refresh]);

  return <AdsGateContext.Provider value={value}>{children}</AdsGateContext.Provider>;
}

export function useAdsGate(): AdsGateContextValue {
  const ctx = useContext(AdsGateContext);
  if (!ctx) {
    throw new Error('useAdsGate must be used within AdsGateProvider');
  }
  return ctx;
}
