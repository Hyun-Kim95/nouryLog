import type { ReactNode, RefObject } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

export function ScreenLayout({
  title,
  subtitle,
  children,
  scroll = true,
  loading,
  headerRight,
  onScroll,
  scrollEventThrottle = 16,
  scrollRef,
  keyboardAvoiding = false,
  contentPaddingBottomExtra = 0,
  keyboardShouldPersistTaps = 'handled',
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
  loading?: boolean;
  headerRight?: ReactNode;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
  scrollRef?: RefObject<ScrollView | null>;
  keyboardAvoiding?: boolean;
  contentPaddingBottomExtra?: number;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
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
    paddingBottom: t.spacing.xxl + contentPaddingBottomExtra,
    gap: t.spacing.md,
  };

  const scrollView = scroll ? (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={contentStyle}
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
    >
      {header}
      {body}
    </ScrollView>
  ) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top', 'left', 'right']}>
      {scroll ? (
        keyboardAvoiding ? (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {scrollView}
          </KeyboardAvoidingView>
        ) : (
          scrollView
        )
      ) : (
        <View style={[{ flex: 1 }, contentStyle]}>
          {header}
          {body}
        </View>
      )}
    </SafeAreaView>
  );
}
