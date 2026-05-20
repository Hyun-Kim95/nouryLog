import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { apiFetch, isAuthDenied } from '../api';
import { ensureAccessToken } from '../authSession';
import { checkoutPremiumWithPlay, restorePremiumWithPlay } from '../billing/checkoutPremium';
import { isPlayBillingEnabled } from '../billing/feature';
import { Banner, Card, CardTitle, PrimaryButton, ScreenLayout } from '../components/ui';
import { BILLING_COPY } from '../copy/billing';
import { useAdsGate } from '../ads/AdsGateContext';
import { useFocusReload } from '../hooks/useFocusReload';
import { useTheme } from '../theme';
import { useToast } from '../toast/useToast';

type Ent = {
  ocrQuotaLimit: number;
  ocrQuotaUsed: number;
  ocrPaidEnabled: boolean;
  premiumActive?: boolean;
};

export function SubscriptionScreen() {
  const t = useTheme();
  const toast = useToast();
  const billingOn = isPlayBillingEnabled;
  const { refresh: refreshAds } = useAdsGate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ent, setEnt] = useState<Ent | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async ({ silent }: { silent: boolean }) => {
    if (!silent) setLoading(true);
    setErr(null);
    try {
      const token = await ensureAccessToken();
      if (!token) return;
      const e = await apiFetch<Ent>('/me/billing/entitlements', { token });
      setEnt(e);
    } catch (e) {
      if (isAuthDenied(e)) return;
      setErr(e instanceof Error ? e.message : BILLING_COPY.loadError);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useFocusReload(load);

  const isPremium = ent?.ocrPaidEnabled === true;

  const checkout = async () => {
    setBusy(true);
    try {
      const token = await ensureAccessToken();
      if (!token) return;
      await checkoutPremiumWithPlay(token);
      toast.show({ kind: 'success', message: BILLING_COPY.subscribeSuccess });
      await load({ silent: true });
      await refreshAds();
    } catch (e) {
      if (isAuthDenied(e)) return;
      toast.show({ kind: 'error', message: e instanceof Error ? e.message : BILLING_COPY.actionError });
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      const token = await ensureAccessToken();
      if (!token) return;
      await restorePremiumWithPlay(token);
      toast.show({ kind: 'success', message: BILLING_COPY.restoreSuccess });
      await load({ silent: true });
    } catch (e) {
      if (isAuthDenied(e)) return;
      toast.show({ kind: 'error', message: e instanceof Error ? e.message : BILLING_COPY.actionError });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenLayout title={BILLING_COPY.title} loading={loading}>
      {err ? (
        <Banner variant="danger" actionLabel="다시 시도" onAction={() => void load({ silent: false })}>
          {err}
        </Banner>
      ) : null}

      {ent ? (
        <View
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: t.spacing.md,
            paddingVertical: t.spacing.xs,
            borderRadius: 999,
            backgroundColor: isPremium ? t.colors.primary : t.colors.surface2,
          }}
        >
          <Text
            style={{
              color: isPremium ? t.colors.primaryFg : t.colors.fgMuted,
              fontWeight: '700',
              fontSize: t.fontSize.caption,
            }}
          >
            {isPremium ? BILLING_COPY.premiumBadge : BILLING_COPY.freeBadge}
          </Text>
        </View>
      ) : null}

      <Card>
        <CardTitle>무료</CardTitle>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>· {BILLING_COPY.freeBenefit1}</Text>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>· {BILLING_COPY.freeBenefit2}</Text>
        {ent ? (
          <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>
            {BILLING_COPY.photoAnalysisUsage(ent.ocrQuotaUsed, ent.ocrQuotaLimit)}
          </Text>
        ) : null}
      </Card>

      <Card>
        <CardTitle>프리미엄</CardTitle>
        {billingOn ? (
          <>
            <Text style={{ color: t.colors.fg, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>
              {BILLING_COPY.premiumPrice}
            </Text>
            <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>{BILLING_COPY.skuLabel}</Text>
          </>
        ) : (
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>{BILLING_COPY.premiumComingSoon}</Text>
        )}
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>· {BILLING_COPY.premiumBenefit1}</Text>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>· {BILLING_COPY.premiumBenefit2}</Text>
      </Card>

      {billingOn && !isPremium ? (
        <PrimaryButton title={BILLING_COPY.subscribeCta} onPress={() => void checkout()} loading={busy} />
      ) : null}
      {billingOn ? (
        <PrimaryButton
          title={BILLING_COPY.restoreCta}
          onPress={() => void restore()}
          loading={busy}
          variant="secondary"
        />
      ) : null}
    </ScreenLayout>
  );
}
