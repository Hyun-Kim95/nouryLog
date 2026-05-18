import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { STATS_COPY } from '../copy/stats';
import { useTheme } from '../theme';

type Props = {
  label: string;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  children: ReactNode;
};

export function StatsPeriodNavigator({
  label,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  children,
}: Props) {
  const t = useTheme();

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
    <View style={{ gap: t.spacing.md }}>
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
      <View style={{ gap: t.spacing.md }}>{children}</View>
    </View>
  );
}
