import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../themeTokens';
import { apiFetch } from '../api';
import { getAccessToken } from '../authStorage';

type Ent = {
  ocrQuotaLimit: number;
  ocrQuotaUsed: number;
  ocrPaidEnabled: boolean;
  nextPaywallTrigger: string;
};

type Ads = { showBottomBanner: boolean; reason: string };

export function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ent, setEnt] = useState<Ent | null>(null);
  const [ads, setAds] = useState<Ads | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('로그인 필요');
      const [e, a] = await Promise.all([
        apiFetch<Ent>('/me/billing/entitlements', { token }),
        apiFetch<Ads>('/me/ads/status', { token }),
      ]);
      setEnt(e);
      setAds(a);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '오류');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>홈</Text>
      {err ? <Text style={styles.err}>{err}</Text> : null}
      {ent && (
        <Text style={styles.body}>
          OCR 무료 {ent.ocrQuotaUsed}/{ent.ocrQuotaLimit} · 유료 OCR {ent.ocrPaidEnabled ? 'ON' : 'OFF'} · 페이월 신호:{' '}
          {ent.nextPaywallTrigger}
        </Text>
      )}
      {ads && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            광고 배너 {ads.showBottomBanner ? '표시' : '숨김'} ({ads.reason})
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  box: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  body: { fontSize: 15, color: colors.text },
  err: { color: colors.danger },
  banner: { padding: 12, backgroundColor: '#eff6ff', borderRadius: 8 },
  bannerText: { fontSize: 14 },
});
