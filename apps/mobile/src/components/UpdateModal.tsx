import { BackHandler, Modal, Text, View } from 'react-native';
import { useEffect } from 'react';
import { APP_UPDATE_COPY } from '../copy/appUpdate';
import { useBottomSafeInset } from '../hooks/useBottomSafeInset';
import { useTheme } from '../theme';
import { PrimaryButton } from './ui/PrimaryButton';
import { TextButton } from './ui/TextButton';

export function UpdateModal({
  visible,
  mode,
  message,
  onUpdate,
  onDismissLater,
}: {
  visible: boolean;
  mode: 'required' | 'optional';
  message?: string;
  onUpdate: () => void;
  onDismissLater?: () => void;
}) {
  const t = useTheme();
  const bottomInset = useBottomSafeInset();
  const required = mode === 'required';

  useEffect(() => {
    if (!visible || !required) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [visible, required]);

  const title = required ? APP_UPDATE_COPY.requiredTitle : APP_UPDATE_COPY.optionalTitle;
  const body =
    message?.trim() ||
    (required ? APP_UPDATE_COPY.requiredBody : APP_UPDATE_COPY.optionalBody);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={required ? () => {} : onDismissLater}
    >
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
            {title}
          </Text>
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>{body}</Text>
          <PrimaryButton title={APP_UPDATE_COPY.updateCta} onPress={onUpdate} />
          {!required && onDismissLater ? (
            <TextButton title={APP_UPDATE_COPY.dismissLater} onPress={onDismissLater} />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
