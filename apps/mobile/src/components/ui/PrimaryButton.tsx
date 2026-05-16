import { ActivityIndicator, Pressable, Text } from 'react-native';
import { useTheme } from '../../theme';

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'danger' | 'secondary';
}) {
  const t = useTheme();
  const bg =
    variant === 'danger'
      ? t.colors.danger
      : variant === 'secondary'
        ? t.colors.surface2
        : t.colors.primary;
  const fg =
    variant === 'danger' ? t.colors.dangerFg : variant === 'secondary' ? t.colors.fg : t.colors.primaryFg;
  const border = variant === 'secondary' ? { borderWidth: 1, borderColor: t.colors.border } : {};

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: bg,
        borderRadius: t.radius.md,
        paddingVertical: t.spacing.md,
        alignItems: 'center',
        opacity: disabled || loading ? 0.5 : pressed ? 0.85 : 1,
        ...border,
      })}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={{ color: fg, fontWeight: '700', fontSize: t.fontSize.body }}>{title}</Text>
      )}
    </Pressable>
  );
}
