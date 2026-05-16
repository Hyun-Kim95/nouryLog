import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../theme';

export type BannerVariant = 'warn' | 'info' | 'danger';

export function Banner({
  variant,
  children,
  actionLabel,
  onAction,
}: {
  variant: BannerVariant;
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const t = useTheme();
  const bg =
    variant === 'warn'
      ? t.mode === 'dark'
        ? 'rgba(252, 211, 77, 0.15)'
        : '#fffbeb'
      : variant === 'danger'
        ? t.mode === 'dark'
          ? 'rgba(248, 113, 113, 0.12)'
          : '#fef2f2'
        : t.mode === 'dark'
          ? 'rgba(147, 197, 253, 0.12)'
          : '#eff6ff';
  const fg =
    variant === 'warn' ? t.colors.warn : variant === 'danger' ? t.colors.danger : t.colors.info;

  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: t.radius.md,
        padding: t.spacing.md,
        gap: t.spacing.sm,
        borderWidth: 1,
        borderColor: t.colors.border,
      }}
    >
      {typeof children === 'string' ? (
        <Text style={{ color: fg, fontSize: t.fontSize.body }}>{children}</Text>
      ) : (
        children
      )}
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction}>
          <Text style={{ color: fg, fontWeight: '700', fontSize: t.fontSize.body }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
