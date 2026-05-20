import { Modal, Text, View } from 'react-native';
import { isPlayBillingEnabled } from '../../billing/feature';
import { BILLING_COPY } from '../../copy/billing';
import { useBottomSafeInset } from '../../hooks/useBottomSafeInset';
import { useTheme } from '../../theme';
import { PrimaryButton } from './PrimaryButton';
import { TextButton } from './TextButton';

export function PaywallModal({
  visible,
  onSubscribe,
  onDismiss,
  busy,
}: {
  visible: boolean;
  onSubscribe?: () => void;
  onDismiss: () => void;
  busy?: boolean;
}) {
  const t = useTheme();
  const bottomInset = useBottomSafeInset();
  const billingOn = isPlayBillingEnabled;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.45)',
        }}
      >
        <View
          style={{
            backgroundColor: t.colors.surface,
            borderTopLeftRadius: t.radius.xl,
            borderTopRightRadius: t.radius.xl,
            paddingTop: t.spacing.xl,
            paddingHorizontal: t.spacing.xl,
            paddingBottom: t.spacing.xl + bottomInset,
            gap: t.spacing.md,
            borderWidth: 1,
            borderColor: t.colors.border,
          }}
        >
          <Text style={{ color: t.colors.fg, fontSize: t.fontSize.title, fontWeight: '700' }}>
            {BILLING_COPY.paywallTitle}
          </Text>
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>
            {billingOn ? BILLING_COPY.paywallBodyBilling : BILLING_COPY.paywallBody}
          </Text>
          {billingOn ? (
            <>
              <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>
                {BILLING_COPY.skuLabel} · {BILLING_COPY.premiumPrice}
              </Text>
              <PrimaryButton
                title={BILLING_COPY.paywallCta}
                onPress={onSubscribe ?? onDismiss}
                loading={busy}
              />
            </>
          ) : (
            <PrimaryButton title={BILLING_COPY.paywallDismiss} onPress={onDismiss} />
          )}
          {billingOn ? (
            <TextButton title={BILLING_COPY.paywallDismiss} onPress={onDismiss} />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
