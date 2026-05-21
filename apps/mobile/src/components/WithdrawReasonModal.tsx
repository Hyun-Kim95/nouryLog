import { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { Field } from './Field';
import { RadioGroup } from './RadioGroup';
import { PrimaryButton } from './ui';
import {
  SETTINGS_COPY,
  USER_WITHDRAWAL_REASON_CODES,
  type UserWithdrawalReasonCode,
} from '../copy/settings';
import { useBottomSafeInset } from '../hooks/useBottomSafeInset';
import { useTheme } from '../theme';

const REASON_OPTIONS = USER_WITHDRAWAL_REASON_CODES.map((value) => ({
  value,
  label: SETTINGS_COPY.withdrawReasonLabels[value],
}));

export type WithdrawReasonPayload = {
  reasonCode: UserWithdrawalReasonCode;
  reasonText?: string;
};

export function WithdrawReasonModal({
  visible,
  onClose,
  onContinue,
}: {
  visible: boolean;
  onClose: () => void;
  onContinue: (payload: WithdrawReasonPayload) => void;
}) {
  const t = useTheme();
  const bottomInset = useBottomSafeInset();
  const [reasonCode, setReasonCode] = useState<UserWithdrawalReasonCode | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!visible) return;
    setReasonCode(null);
    setReasonText('');
    setError(undefined);
  }, [visible]);

  const handleContinue = () => {
    if (!reasonCode) {
      setError(SETTINGS_COPY.withdrawReasonRequired);
      return;
    }
    const trimmed = reasonText.trim();
    if (reasonCode === 'etc' && !trimmed) {
      setError(SETTINGS_COPY.withdrawEtcRequired);
      return;
    }
    setError(undefined);
    onContinue({
      reasonCode,
      reasonText: reasonCode === 'etc' ? trimmed : undefined,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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
            maxHeight: '88%',
          }}
        >
          <Text style={{ color: t.colors.fg, fontSize: t.fontSize.title, fontWeight: '700' }}>
            {SETTINGS_COPY.withdrawModalTitle}
          </Text>
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>
            {SETTINGS_COPY.withdrawModalBody}
          </Text>

          <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
            <RadioGroup<UserWithdrawalReasonCode>
              label={SETTINGS_COPY.withdrawReasonLabel}
              required
              options={REASON_OPTIONS}
              value={reasonCode}
              onChange={setReasonCode}
              error={error && !reasonCode ? error : undefined}
            />
            {reasonCode === 'etc' ? (
              <Field
                label={SETTINGS_COPY.withdrawEtcLabel}
                helper={SETTINGS_COPY.withdrawEtcHelper}
                error={error && reasonCode === 'etc' ? error : undefined}
                value={reasonText}
                onChangeText={setReasonText}
                multiline
              />
            ) : null}
          </ScrollView>

          <PrimaryButton title={SETTINGS_COPY.withdrawContinue} onPress={handleContinue} />
          <PrimaryButton title={SETTINGS_COPY.withdrawCancel} variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
