import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import { useTheme } from '../theme';
import { navigationRef } from '../authSession';
import { useDevToggles, isDevBuild, type ThemeOverride } from './devToggles';
import { setOnboardingDone, clearTokens } from '../authStorage';
import type { RootStackParamList } from '../navigation';

/**
 * 개발자 도구는 설정 화면에서만 열 수 있다(__DEV__ 빌드).
 * `docs/design/mobile-onboarding-spec.md` §9 시각 점검 체크리스트용.
 */
export function DevToolsSection() {
  if (!isDevBuild()) return null;
  return <DevToolsSectionInner />;
}

function DevToolsSectionInner() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const dev = useDevToggles();
  const [open, setOpen] = useState(false);

  const resetTo = (name: keyof RootStackParamList) => {
    if (!navigationRef.isReady()) return;
    navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name }] }));
  };

  const onResetOnboarding = async () => {
    await setOnboardingDone(false);
    setOpen(false);
    resetTo('Onboarding');
  };

  const onForceLogout = async () => {
    await clearTokens();
    setOpen(false);
    resetTo('Login');
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="개발자 도구 열기"
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          borderColor: t.colors.border,
          borderWidth: 1,
          borderRadius: t.radius.md,
          padding: t.spacing.md,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body, fontWeight: '600' }}>
          개발자 도구 열기
        </Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        supportedOrientations={['portrait']}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            onPress={() => {}}
            style={[
              styles.sheet,
              {
                backgroundColor: t.colors.surface,
                borderColor: t.colors.border,
                paddingTop: t.spacing.lg,
                paddingBottom: Math.max(insets.bottom, t.spacing.lg) + t.spacing.md,
                paddingHorizontal: t.spacing.lg,
                borderTopLeftRadius: t.radius.lg,
                borderTopRightRadius: t.radius.lg,
                gap: t.spacing.md,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: t.colors.fg, fontSize: t.fontSize.title, fontWeight: '700' }}>
                DEV 패널 (시각 점검용)
              </Text>
              <Pressable
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="닫기"
                style={{ padding: 8 }}
              >
                <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.bodyLg }}>닫기</Text>
              </Pressable>
            </View>

            <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
              빌드: {Platform.OS} dev. 운영 빌드에는 노출되지 않습니다.
            </Text>

            <ScrollView contentContainerStyle={{ gap: t.spacing.md }}>
              <Section title="테마 강제">
                <ThemeRadio
                  current={dev.themeOverride}
                  onChange={dev.setThemeOverride}
                  options={[
                    { value: 'system', label: '시스템 추종' },
                    { value: 'light', label: '라이트' },
                    { value: 'dark', label: '다크' },
                  ]}
                />
              </Section>

              <Section title="API 시뮬레이션">
                <ToggleRow
                  label="saveProfile 5xx 강제"
                  value={dev.force5xx}
                  onChange={dev.setForce5xx}
                  hint="다음 '다음' 클릭 시 PUT /me/profile이 강제로 500 응답을 발생시킵니다."
                />
                <ToggleRow
                  label="recalcRecommendation 실패 강제"
                  value={dev.forceRecalcFail}
                  onChange={dev.setForceRecalcFail}
                  hint="저장은 성공하지만 권장 재계산이 실패해 토스트 경고 후 Main 진입을 검증할 수 있습니다."
                />
              </Section>

              <Section title="흐름 트리거">
                <ActionRow
                  label="온보딩 재진입"
                  hint="dm_onboarding_done 플래그를 제거하고 Onboarding 라우트로 reset 합니다."
                  onPress={() => void onResetOnboarding()}
                  bg={t.colors.primary}
                  fg={t.colors.primaryFg}
                />
                <ActionRow
                  label="강제 로그아웃"
                  hint="모든 토큰과 온보딩 플래그를 제거하고 Login으로 reset 합니다."
                  onPress={() => void onForceLogout()}
                  bg={t.colors.surface2}
                  fg={t.colors.fg}
                  border={t.colors.border}
                />
              </Section>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: t.spacing.sm }}>
      <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, fontWeight: '700' }}>
        {title.toUpperCase()}
      </Text>
      <View style={{ gap: t.spacing.sm }}>{children}</View>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: t.spacing.md,
        borderRadius: t.radius.md,
        borderWidth: 1,
        borderColor: t.colors.border,
        backgroundColor: t.colors.surface2,
        gap: t.spacing.md,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>{label}</Text>
        {hint ? (
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, marginTop: 2 }}>{hint}</Text>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

function ActionRow({
  label,
  hint,
  onPress,
  bg,
  fg,
  border,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
  bg: string;
  fg: string;
  border?: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        padding: t.spacing.md,
        borderRadius: t.radius.md,
        backgroundColor: bg,
        borderWidth: border ? 1 : 0,
        borderColor: border ?? 'transparent',
        opacity: pressed ? 0.85 : 1,
        gap: 2,
      })}
    >
      <Text style={{ color: fg, fontSize: t.fontSize.body, fontWeight: '700' }}>{label}</Text>
      {hint ? (
        <Text style={{ color: fg, opacity: 0.85, fontSize: t.fontSize.caption }}>{hint}</Text>
      ) : null}
    </Pressable>
  );
}

function ThemeRadio({
  current,
  onChange,
  options,
}: {
  current: ThemeOverride;
  onChange: (v: ThemeOverride) => void;
  options: { value: ThemeOverride; label: string }[];
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        borderRadius: t.radius.md,
        borderWidth: 1,
        borderColor: t.colors.border,
        overflow: 'hidden',
      }}
    >
      {options.map((opt, idx) => {
        const selected = current === opt.value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1,
              paddingVertical: t.spacing.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? t.colors.primary : 'transparent',
              borderLeftWidth: idx === 0 ? 0 : 1,
              borderLeftColor: t.colors.border,
            }}
          >
            <Text
              style={{
                color: selected ? t.colors.primaryFg : t.colors.fg,
                fontWeight: selected ? '700' : '500',
                fontSize: t.fontSize.body,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderWidth: 1,
    maxHeight: '80%',
  },
});
