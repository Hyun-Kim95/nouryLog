import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { apiFetch } from '../api';
import { getAccessToken } from '../authStorage';
import { Banner, Card, CardTitle, PrimaryButton, ScreenLayout } from '../components/ui';
import { BILLING_COPY } from '../copy/billing';
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
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ent, setEnt] = useState<Ent | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('로그인 필요');
      const e = await apiFetch<Ent>('/me/billing/entitlements', { token });
      setEnt(e);
    } catch (e) {
      setErr(e instanceof Error ? e.message : BILLING_COPY.loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isPremium = ent?.ocrPaidEnabled === true;

  const checkout = async () => {
    setBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('로그인 필요');
      await apiFetch('/me/billing/checkout', {
        method: 'POST',
        token,
        body: JSON.stringify({ productType: 'premium_monthly' }),
      });
      toast.show({ kind: 'success', message: BILLING_COPY.subscribeSuccess });
      await load();
    } catch (e) {
      toast.show({ kind: 'error', message: e instanceof Error ? e.message : BILLING_COPY.actionError });
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('로그인 필요');
      await apiFetch('/me/billing/restore', { method: 'POST', token, body: JSON.stringify({}) });
      toast.show({ kind: 'success', message: BILLING_COPY.restoreSuccess });
      await load();
    } catch (e) {
      toast.show({ kind: 'error', message: e instanceof Error ? e.message : BILLING_COPY.actionError });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenLayout title={BILLING_COPY.title} loading={loading}>
      {err ? (
        <Banner variant="danger" actionLabel="다시 시도" onAction={() => void load()}>
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
            OCR {ent.ocrQuotaUsed}/{ent.ocrQuotaLimit}회 사용
          </Text>
        ) : null}
      </Card>

      <Card>
        <CardTitle>프리미엄</CardTitle>
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>
          {BILLING_COPY.premiumPrice}
        </Text>
        <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>{BILLING_COPY.skuLabel}</Text>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>· {BILLING_COPY.premiumBenefit1}</Text>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>· {BILLING_COPY.premiumBenefit2}</Text>
      </Card>

      {!isPremium ? (
        <PrimaryButton title={BILLING_COPY.subscribeCta} onPress={() => void checkout()} loading={busy} />
      ) : null}
      <PrimaryButton
        title={BILLING_COPY.restoreCta}
        onPress={() => void restore()}
        loading={busy}
        variant="secondary"
      />
    </ScreenLayout>
  );
}
