import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from './ui';
import { useTheme } from '../theme';

type Props = {
  visible: boolean;
  value: string;
  unitLabel?: string;
  busy?: boolean;
  onChangeValue: (next: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

export function PortionQuantityModal({
  visible,
  value,
  unitLabel,
  busy,
  onChangeValue,
  onConfirm,
  onClose,
}: Props) {
  const t = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.35)',
          justifyContent: 'center',
          paddingHorizontal: t.spacing.lg,
        }}
      >
        <Pressable style={{ position: 'absolute', inset: 0 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: t.colors.surface,
            borderRadius: t.radius.lg,
            borderWidth: 1,
            borderColor: t.colors.border,
            padding: t.spacing.lg,
            gap: t.spacing.md,
          }}
        >
          <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '700' }}>분량 직접 입력</Text>
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
            0.25~50 범위의 숫자를 입력해 주세요.
          </Text>
          <TextInput
            value={value}
            onChangeText={onChangeValue}
            keyboardType="decimal-pad"
            placeholder={unitLabel ? `예: 1.5 (${unitLabel})` : '예: 1.5'}
            autoFocus
            editable={!busy}
            style={{
              borderWidth: 1,
              borderColor: t.colors.border,
              borderRadius: t.radius.md,
              color: t.colors.fg,
              backgroundColor: t.colors.surface2,
              paddingHorizontal: t.spacing.md,
              paddingVertical: t.spacing.sm,
              fontSize: t.fontSize.body,
            }}
          />
          <View style={{ gap: t.spacing.sm }}>
            <PrimaryButton title="적용" onPress={onConfirm} loading={busy} />
            <PrimaryButton title="취소" onPress={onClose} variant="secondary" disabled={busy} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
