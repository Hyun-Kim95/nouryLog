import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Button, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  getPolicyDocument,
  postConsents,
  socialExchangeRequest,
  socialResolveConflictRequest,
  type ConsentVersions,
  type PolicyDocument,
  type PolicyKind,
  type SocialProvider,
} from '../api';
import { Banner, ScreenLayout } from '../components/ui';
import { socialAdapter } from '../social';
import { consumeLoginNotice } from '../authSession';
import { getOnboardingDone, parseUserIdFromAccessToken, saveTokens } from '../authStorage';
import { resolveOnboardingComplete } from '../lib/onboardingGate';
import { promiseWithTimeout } from '../lib/promiseTimeout';
import { logAppError, toUserMessage } from '../lib/userFacingError';
import { useTheme } from '../theme';
import { useToast } from '../toast/useToast';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LOGIN_TIMEOUT_MS = 90_000;
const LOGIN_TIMEOUT_MESSAGE = '로그인 시간이 초과되었어요. 다시 시도해 주세요.';

export function LoginScreen({ navigation }: Props) {
  const t = useTheme();
  const toast = useToast();
  const [err, setErr] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [busyProvider, setBusyProvider] = useState<SocialProvider | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [conflictToken, setConflictToken] = useState<string | null>(null);
  const [conflictEmail, setConflictEmail] = useState<string | null>(null);
  const [pendingSocial, setPendingSocial] = useState<{
    accessToken: string;
    refreshToken: string;
    source: string;
  } | null>(null);
  const [socialAgeConfirmed, setSocialAgeConfirmed] = useState(false);
  const [socialTermsAgreed, setSocialTermsAgreed] = useState(false);
  const [socialPrivacyAgreed, setSocialPrivacyAgreed] = useState(false);
  const [socialPolicies, setSocialPolicies] = useState<Record<PolicyKind, PolicyDocument | null>>({
    terms: null,
    privacy: null,
  });

  useFocusEffect(
    useCallback(() => {
      const notice = consumeLoginNotice();
      if (notice) setSessionNotice(notice);
      setBusyProvider(null);
    }, []),
  );

  const goAfterLogin = async (accessToken: string) => {
    let done = false;
    try {
      const userId = parseUserIdFromAccessToken(accessToken);
      if (userId && (await getOnboardingDone(userId))) {
        done = true;
      } else {
        done = await resolveOnboardingComplete(accessToken);
      }
    } catch (e) {
      if (__DEV__) console.warn('[Login] onboarding resolve failed', e);
    }
    navigation.reset({ index: 0, routes: [{ name: done ? 'Main' : 'Onboarding' }] });
  };

  const ensurePolicyVersions = async (): Promise<ConsentVersions> => {
    const terms = socialPolicies.terms ?? (await getPolicyDocument('terms'));
    const privacy = socialPolicies.privacy ?? (await getPolicyDocument('privacy'));
    setSocialPolicies({ terms, privacy });
    return {
      terms: { version: terms.version },
      privacy: { version: privacy.version },
    };
  };

  const completeTokenLogin = async (
    accessToken: string,
    refreshToken: string,
    options?: { requiresConsent?: boolean; source?: string },
  ) => {
    if (options?.requiresConsent) {
      setPendingSocial({ accessToken, refreshToken, source: options.source ?? 'social-signup' });
      toast.show({ kind: 'info', message: '서비스 이용 전 필수 약관에 동의해 주세요.' });
      return;
    }
    await saveTokens(accessToken, refreshToken);
    await goAfterLogin(accessToken);
  };

  const onSocialLogin = async (provider: SocialProvider) => {
    if (busyProvider || actionBusy) return;
    setErr(null);
    setConflictToken(null);
    setConflictEmail(null);
    setBusyProvider(provider);
    try {
      const adapter = socialAdapter(provider);
      const sdkResult = await promiseWithTimeout(
        adapter.login(),
        LOGIN_TIMEOUT_MS,
        LOGIN_TIMEOUT_MESSAGE,
      );
      if (sdkResult.kind === 'cancelled') {
        const msg = 'SNS 로그인이 취소되었습니다.';
        setErr(msg);
        toast.show({ kind: 'info', message: msg });
        return;
      }
      if (sdkResult.kind === 'error') {
        setErr(sdkResult.message);
        toast.show({ kind: 'error', message: sdkResult.message });
        return;
      }

      const response = await socialExchangeRequest(provider, {
        providerAccessToken: sdkResult.providerAccessToken,
        idToken: sdkResult.idToken,
        source: `social-sdk:${provider}`,
      });

      if (response.result === 'success') {
        toast.show({ kind: 'success', message: 'SNS로 로그인했어요.' });
        await completeTokenLogin(response.accessToken, response.refreshToken, {
          requiresConsent: response.requiresConsent === true,
          source: `social-signup:${provider}`,
        });
        return;
      }
      if (response.result === 'conflict') {
        console.warn('[social-sdk]', 'account_conflict', { provider, email: response.email });
        setConflictToken(response.conflictToken);
        setConflictEmail(response.email);
        toast.show({
          kind: 'info',
          message: '기존 계정과 이메일이 충돌해요. 어떻게 처리할지 선택해 주세요.',
        });
        return;
      }
      const unknownMsg = 'SNS 로그인 응답이 예상과 다릅니다.';
      console.warn('[social-sdk]', 'unknown_exchange_result', { provider, response });
      setErr(unknownMsg);
      toast.show({ kind: 'error', message: unknownMsg });
    } catch (e) {
      logAppError('[Login] social', e, { provider });
      const msg = toUserMessage(e, { context: 'login' });
      setErr(msg);
      toast.show({ kind: 'error', message: msg });
    } finally {
      setBusyProvider(null);
    }
  };

  const onResolveConflict = async (action: 'link' | 'separate') => {
    if (!conflictToken || busyProvider || actionBusy) return;
    setErr(null);
    setActionBusy(true);
    try {
      const tokens = await socialResolveConflictRequest(conflictToken, action);
      toast.show({
        kind: 'success',
        message: action === 'link' ? '기존 계정과 연결했어요.' : '새 계정으로 가입했어요.',
      });
      await completeTokenLogin(tokens.accessToken, tokens.refreshToken, {
        requiresConsent: tokens.requiresConsent === true,
        source: `social-conflict:${action}`,
      });
    } catch (e) {
      logAppError('[Login] conflict', e);
      const msg = toUserMessage(e, { context: 'login', fallback: '계정 연결 처리에 실패했어요.' });
      setErr(msg);
      toast.show({ kind: 'error', message: msg });
    } finally {
      setActionBusy(false);
    }
  };

  const onSubmitSocialConsent = async () => {
    if (!pendingSocial || busyProvider || actionBusy) return;
    setErr(null);
    setActionBusy(true);
    try {
      const consents = await ensurePolicyVersions();
      await postConsents(pendingSocial.accessToken, {
        ageConfirmed: socialAgeConfirmed,
        consents,
        source: pendingSocial.source,
      });
      await saveTokens(pendingSocial.accessToken, pendingSocial.refreshToken);
      toast.show({ kind: 'success', message: '약관 동의를 저장했어요.' });
      await goAfterLogin(pendingSocial.accessToken);
    } catch (e) {
      logAppError('[Login] consent', e);
      const msg = toUserMessage(e, { context: 'login', fallback: '동의 저장에 실패했어요.' });
      setErr(msg);
      toast.show({ kind: 'error', message: msg });
    } finally {
      setActionBusy(false);
    }
  };

  const socialDisabled = busyProvider != null || actionBusy;

  return (
    <ScreenLayout title="식단 관리" subtitle="SNS로 로그인해요.">
      {sessionNotice ? <Banner variant="warn">{sessionNotice}</Banner> : null}
      {err ? <Banner variant="danger">{err}</Banner> : null}

      <SocialLoginButton
        label="네이버 로그인"
        provider="naver"
        busyProvider={busyProvider}
        disabled={socialDisabled}
        backgroundColor="#03c75a"
        textColor="#fff"
        onPress={() => void onSocialLogin('naver')}
      />
      <SocialLoginButton
        label="구글 로그인"
        provider="google"
        busyProvider={busyProvider}
        disabled={socialDisabled}
        backgroundColor="#4285f4"
        textColor="#fff"
        onPress={() => void onSocialLogin('google')}
      />
      <SocialLoginButton
        label="카카오 로그인"
        provider="kakao"
        busyProvider={busyProvider}
        disabled={socialDisabled}
        backgroundColor="#fee500"
        textColor="#1f1f1f"
        onPress={() => void onSocialLogin('kakao')}
      />

      {conflictToken ? (
        <View
          style={{
            marginTop: t.spacing.sm,
            borderWidth: 1,
            borderColor: t.colors.border,
            borderRadius: t.radius.md,
            padding: t.spacing.md,
            backgroundColor: t.colors.surface,
            gap: t.spacing.sm,
          }}
        >
          <Text style={{ color: t.colors.fg, fontWeight: '700', fontSize: t.fontSize.body }}>
            기존 계정과 이메일이 충돌합니다.
          </Text>
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>
            {conflictEmail ? `대상: ${conflictEmail}` : '대상 이메일 확인 불가'}
          </Text>
          <Button
            title="기존 계정 연결"
            onPress={() => void onResolveConflict('link')}
            disabled={socialDisabled}
            color={t.colors.primary}
          />
          <Button
            title="새 SNS 계정 생성"
            onPress={() => void onResolveConflict('separate')}
            disabled={socialDisabled}
            color={t.colors.primary}
          />
          <Button
            title="취소"
            onPress={() => {
              setConflictToken(null);
              setConflictEmail(null);
            }}
            disabled={socialDisabled}
            color={t.colors.fgMuted}
          />
        </View>
      ) : null}

      {pendingSocial ? (
        <View
          style={{
            marginTop: t.spacing.sm,
            borderWidth: 1,
            borderColor: t.colors.border,
            borderRadius: t.radius.md,
            padding: t.spacing.md,
            backgroundColor: t.colors.surface,
            gap: t.spacing.sm,
          }}
        >
          <Text style={{ color: t.colors.fg, fontWeight: '700', fontSize: t.fontSize.body }}>
            필수 약관 동의
          </Text>
          <ConsentRow
            label="만 14세 이상입니다."
            checked={socialAgeConfirmed}
            onToggle={() => setSocialAgeConfirmed((v) => !v)}
          />
          <ConsentRow
            label="이용약관에 동의합니다."
            checked={socialTermsAgreed}
            onToggle={() => setSocialTermsAgreed((v) => !v)}
            onView={() => navigation.navigate('PolicyView', { kind: 'terms' })}
          />
          <ConsentRow
            label="개인정보처리방침에 동의합니다."
            checked={socialPrivacyAgreed}
            onToggle={() => setSocialPrivacyAgreed((v) => !v)}
            onView={() => navigation.navigate('PolicyView', { kind: 'privacy' })}
          />
          <Button
            title="동의하고 시작"
            onPress={() => void onSubmitSocialConsent()}
            disabled={socialDisabled || !socialAgeConfirmed || !socialTermsAgreed || !socialPrivacyAgreed}
            color={t.colors.primary}
          />
        </View>
      ) : null}
    </ScreenLayout>
  );
}

function SocialLoginButton({
  label,
  provider,
  busyProvider,
  disabled,
  backgroundColor,
  textColor,
  onPress,
}: {
  label: string;
  provider: SocialProvider;
  busyProvider: SocialProvider | null;
  disabled: boolean;
  backgroundColor: string;
  textColor: string;
  onPress: () => void;
}) {
  const t = useTheme();
  const loading = busyProvider === provider;
  const isDisabled = disabled && !loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.socialBtn,
        {
          borderRadius: t.radius.md,
          padding: t.spacing.md,
          backgroundColor,
          opacity: isDisabled ? 0.5 : 1,
        },
      ]}
      onPress={onPress}
      disabled={isDisabled || loading}
    >
      {loading ? (
        <View style={styles.socialLoadingRow}>
          <ActivityIndicator color={textColor} size="small" />
          <Text style={[styles.socialText, { color: textColor }]}>로그인 중…</Text>
        </View>
      ) : (
        <Text style={[styles.socialText, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

function ConsentRow({
  label,
  checked,
  onToggle,
  onView,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  onView?: () => void;
}) {
  const t = useTheme();
  return (
    <View style={styles.consentRow}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onToggle} style={styles.checkboxWrap}>
        <View
          style={[
            styles.checkbox,
            {
              borderColor: checked ? t.colors.primary : t.colors.borderStrong,
              backgroundColor: checked ? t.colors.primary : 'transparent',
            },
          ]}
        >
          <Text style={{ color: t.colors.primaryFg, fontSize: t.fontSize.caption }}>{checked ? '✓' : ''}</Text>
        </View>
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body }}>{label}</Text>
      </Pressable>
      {onView ? (
        <Pressable accessibilityRole="button" onPress={onView} hitSlop={8}>
          <Text style={{ color: t.colors.info, fontSize: t.fontSize.body, fontWeight: '700' }}>보기</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  socialBtn: { alignItems: 'center' },
  socialLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  socialText: { fontWeight: '600' },
  consentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  checkboxWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  checkbox: { width: 22, height: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
