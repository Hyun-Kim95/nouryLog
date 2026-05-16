import type { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

export function ScreenLayout({
  title,
  subtitle,
  children,
  scroll = true,
  loading,
  headerRight,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
  loading?: boolean;
  headerRight?: ReactNode;
}) {
  const t = useTheme();

  const header =
    title || subtitle ? (
      <View style={{ gap: t.spacing.xs, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: t.spacing.xs }}>
          {title ? (
            <Text style={{ color: t.colors.fg, fontSize: t.fontSize.display, fontWeight: '700' }}>{title}</Text>
          ) : null}
          {subtitle ? (
            <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>{subtitle}</Text>
          ) : null}
        </View>
        {headerRight}
      </View>
    ) : null;

  const body = loading ? (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: t.spacing.xxl }}>
      <ActivityIndicator color={t.colors.primary} />
    </View>
  ) : (
    children
  );

  const contentStyle = {
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.lg,
    paddingBottom: t.spacing.xxl,
    gap: t.spacing.md,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={contentStyle}>
          {header}
          {body}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, contentStyle]}>
          {header}
          {body}
        </View>
      )}
    </SafeAreaView>
  );
}
