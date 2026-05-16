import type { ReactNode } from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

export function Card({
  children,
  style,
  dashed,
}: {
  children: ReactNode;
  style?: ViewStyle;
  dashed?: boolean;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          padding: t.spacing.md,
          borderRadius: t.radius.md,
          borderColor: dashed ? t.colors.borderStrong : t.colors.border,
          borderWidth: 1,
          borderStyle: dashed ? 'dashed' : 'solid',
          backgroundColor: t.colors.surface,
          gap: t.spacing.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function CardTitle({ children }: { children: string }) {
  const t = useTheme();
  return (
    <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, fontWeight: '700' }}>
      {children}
    </Text>
  );
}
