import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { STATS_COPY } from '../copy/stats';
import { useTheme } from '../theme';

type Props = {
  label: string;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  swipeEnabled: boolean;
  children: ReactNode;
};

export function StatsPeriodNavigator({
  label,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  swipeEnabled,
  children,
}: Props) {
  const t = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const pageWidth = Math.max(1, windowWidth - t.spacing.lg * 2);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToCenter = useCallback(
    (animated: boolean) => {
      scrollRef.current?.scrollTo({ x: pageWidth, y: 0, animated });
    },
    [pageWidth],
  );

  useEffect(() => {
    scrollToCenter(false);
  }, [label, pageWidth, scrollToCenter]);

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (page === 0 && canGoPrev) {
      onPrev();
    } else if (page === 2 && canGoNext) {
      onNext();
    }
    scrollToCenter(false);
  };

  const navBtn = (dir: 'prev' | 'next', enabled: boolean, onPress: () => void) => (
    <Pressable
      onPress={enabled ? onPress : undefined}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={dir === 'prev' ? STATS_COPY.periodPrev : STATS_COPY.periodNext}
      accessibilityState={{ disabled: !enabled }}
      hitSlop={8}
      style={{
        width: 40,
        height: 40,
        borderRadius: t.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: enabled ? 1 : 0.35,
      }}
    >
      <Ionicons
        name={dir === 'prev' ? 'chevron-back' : 'chevron-forward'}
        size={22}
        color={t.colors.fg}
      />
    </Pressable>
  );

  return (
    <View style={{ gap: t.spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs }}>
        {navBtn('prev', canGoPrev, onPrev)}
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            color: t.colors.fg,
            fontSize: t.fontSize.body,
            fontWeight: '600',
          }}
          numberOfLines={2}
        >
          {label}
        </Text>
        {navBtn('next', canGoNext, onNext)}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={swipeEnabled && (canGoPrev || canGoNext)}
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        contentOffset={{ x: pageWidth, y: 0 }}
        onMomentumScrollEnd={onMomentumScrollEnd}
        style={{ marginHorizontal: -t.spacing.lg }}
      >
        <View style={{ width: pageWidth }} />
        <View style={{ width: pageWidth, paddingHorizontal: t.spacing.lg, gap: t.spacing.md }}>{children}</View>
        <View style={{ width: pageWidth }} />
      </ScrollView>
    </View>
  );
}
