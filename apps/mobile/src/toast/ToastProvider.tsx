import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

export type ToastKind = 'success' | 'error' | 'info';

export type ToastInput = {
  kind: ToastKind;
  message: string;
};

export type ToastApi = {
  show: (input: ToastInput) => void;
  hide: () => void;
};

type Internal = {
  id: number;
  kind: ToastKind;
  message: string;
};

const DURATION_MS: Record<ToastKind, number> = {
  success: 3500,
  info: 3500,
  error: 5000,
};

const ICON: Record<ToastKind, string> = {
  success: '✓',
  error: '✕',
  info: 'ⓘ',
};

const FADE_MS = 200;

export const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState<Internal | null>(null);
  const activeRef = useRef<Internal | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const idRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const animateOut = useCallback(
    (onDone?: () => void) => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: FADE_MS,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }),
        Animated.timing(translateY, {
          toValue: 12,
          duration: FADE_MS,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }),
      ]).start(() => onDone?.());
    },
    [opacity, translateY],
  );

  const animateIn = useCallback(() => {
    opacity.setValue(0);
    translateY.setValue(12);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_MS,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start();
  }, [opacity, translateY]);

  const hide = useCallback(() => {
    clearTimer();
    animateOut(() => setActive(null));
  }, [animateOut, clearTimer]);

  const show = useCallback(
    (input: ToastInput) => {
      clearTimer();
      const next: Internal = { id: ++idRef.current, kind: input.kind, message: input.message };
      if (activeRef.current) {
        animateOut(() => setActive(next));
      } else {
        setActive(next);
      }
    },
    [animateOut, clearTimer],
  );

  useEffect(() => {
    if (active === null) return;
    animateIn();
    const dur = DURATION_MS[active.kind];
    timerRef.current = setTimeout(() => {
      animateOut(() => setActive(null));
    }, dur);
    return () => clearTimer();
  }, [active, animateIn, animateOut, clearTimer]);

  const api = useMemo<ToastApi>(() => ({ show, hide }), [show, hide]);

  const borderColor = active
    ? active.kind === 'success'
      ? t.colors.success
      : active.kind === 'error'
        ? t.colors.danger
        : t.colors.info
    : t.colors.border;

  const a11yPrefix = active
    ? active.kind === 'success'
      ? '성공'
      : active.kind === 'error'
        ? '오류'
        : '안내'
    : '';

  return (
    <ToastContext.Provider value={api}>
      {children}
      {active ? (
        <Animated.View
          accessibilityRole="alert"
          accessibilityLiveRegion={active.kind === 'error' ? 'assertive' : 'polite'}
          accessibilityLabel={`${a11yPrefix} 알림: ${active.message}`}
          accessibilityHint="탭하면 알림을 닫습니다."
          style={[
            styles.container,
            {
              bottom: insets.bottom + t.spacing.xl,
              left: t.spacing.lg,
              right: t.spacing.lg,
              opacity,
              transform: [{ translateY }],
            },
          ]}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={hide}
            style={({ pressed }) => ({
              backgroundColor: t.colors.surface,
              borderColor,
              borderWidth: 1,
              borderRadius: t.radius.lg,
              padding: t.spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.spacing.sm,
              opacity: pressed ? 0.92 : 1,
            })}
          >
            <Text style={{ color: borderColor, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>
              {ICON[active.kind]}
            </Text>
            <Text
              numberOfLines={3}
              style={{ flex: 1, color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '500' }}
            >
              {active.message}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
});
