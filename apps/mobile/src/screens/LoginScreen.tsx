import { useState } from 'react';
import { Button, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import {
  getPolicyDocument,
  loginRequest,
  postConsents,
  socialResolveConflictRequest,
  socialStartRequest,
  type ConsentVersions,
  type PolicyDocument,
  type PolicyKind,
  type SocialProvider,
} from '../api';
import { getOnboardingDone, saveTokens } from '../authStorage';
import { useTheme } from '../theme';
import { useToast } from '../toast/useToast';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;
WebBrowser.maybeCompleteAuthSession();

export function LoginScreen({ navigation }: Props) {
  const t = useTheme();
  const toast = useToast();
  const [email, setEmail] = useState('user@example.com');
  const [password, setPassword] = useState('user123');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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

  const goAfterLogin = async () => {
    const done = await getOnboardingDone();
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
    await goAfterLogin();
  };

  const onLogin = async () => {
    setErr(null);
    setBusy(true);
    try {
      const tokens = await loginRequest(email.trim(), password);
      await saveTokens(tokens.accessToken, tokens.refreshToken);
      toast.show({ kind: 'success', message: '로그인했어요.' });
      await goAfterLogin();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '오류';
      setErr(msg);
      toast.show({ kind: 'error', message: msg });
    } finally {
      setBusy(false);
    }
  };

  const onSocialLogin = async (provider: SocialProvider) => {
    setErr(null);
    setConflictToken(null);
    setConflictEmail(null);
    setBusy(true);
    try {
      const redirectUri = AuthSession.makeRedirectUri({ scheme: 'dietmobile', path: 'oauth' });
      const { authorizationUrl } = await socialStartRequest(provider, redirectUri);
      const result = await WebBrowser.openAuthSessionAsync(authorizationUrl, redirectUri);
      if (result.type !== 'success' || !result.url) {
        const msg = 'SNS 로그인이 취소되었습니다.';
        setErr(msg);
        toast.show({ kind: 'info', message: msg });
        return;
      }
      const parsed = Linking.parse(result.url);
      const query = parsed.queryParams as Record<string, string | undefined>;
      if (query.result === 'success' && query.accessToken && query.refreshToken) {
        toast.show({ kind: 'success', message: 'SNS로 로그인했어요.' });
        await completeTokenLogin(query.accessToken, query.refreshToken, {
          requiresConsent: query.requiresConsent === 'true',
          source: `social-signup:${provider}`,
        });
        return;
      }
      if (query.result === 'conflict' && query.conflictToken) {
        setConflictToken(query.conflictToken);
        setConflictEmail(query.email ?? null);
        toast.show({
          kind: 'info',
          message: '기존 계정과 이메일이 충돌해요. 어떻게 처리할지 선택해 주세요.',
        });
        return;
      }
      const msg = query.message ?? 'SNS 로그인 실패';
      setErr(msg);
      toast.show({ kind: 'error', message: msg });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'SNS 로그인 실패';
      setErr(msg);
      toast.show({ kind: 'error', message: msg });
    } finally {
      setBusy(false);
    }
  };

  const onResolveConflict = async (action: 'link' | 'separate') => {
    if (!conflictToken) return;
    setErr(null);
    setBusy(true);
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
      const msg = e instanceof Error ? e.message : '계정 연결 처리 실패';
      setErr(msg);
      toast.show({ kind: 'error', message: msg });
    } finally {
      setBusy(false);
    }
  };

  const onSubmitSocialConsent = async () => {
    if (!pendingSocial) return;
    setErr(null);
    setBusy(true);
    try {
      const consents = await ensurePolicyVersions();
      await postConsents(pendingSocial.accessToken, {
        ageConfirmed: socialAgeConfirmed,
        consents,
        source: pendingSocial.source,
      });
      await saveTokens(pendingSocial.accessToken, pendingSocial.refreshToken);
      toast.show({ kind: 'success', message: '약관 동의를 저장했어요.' });
      await goAfterLogin();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '동의 저장 실패';
      setErr(msg);
      toast.show({ kind: 'error', message: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.box, { backgroundColor: t.colors.bg, padding: t.spacing.xl, gap: t.spacing.md }]}>
      <Text style={{ color: t.colors.fg, fontSize: t.fontSize.title, fontWeight: '700' }}>식단 관리</Text>
      <Text style={{ color: t.colors.fgMuted, marginBottom: t.spacing.sm, fontSize: t.fontSize.body }}>
        시드: user@example.com / user123
      </Text>
      {err ? (
        <Text style={{ color: t.colors.danger, fontSize: t.fontSize.body }}>{err}</Text>
      ) : null}
      <TextInput
        style={[
          styles.input,
          {
            borderColor: t.colors.border,
            backgroundColor: t.colors.surface,
            color: t.colors.fg,
            borderRadius: t.radius.md,
            padding: t.spacing.md,
          },
        ]}
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        placeholder="이메일"
        placeholderTextColor={t.colors.fgSubtle}
      />
      <TextInput
        style={[
          styles.input,
          {
            borderColor: t.colors.border,
            backgroundColor: t.colors.surface,
            color: t.colors.fg,
            borderRadius: t.radius.md,
            padding: t.spacing.md,
          },
        ]}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder="비밀번호"
        placeholderTextColor={t.colors.fgSubtle}
      />
      <Button
        title={busy ? '처리 중...' : '로그인'}
        onPress={() => void onLogin()}
        disabled={busy}
        color={t.colors.primary}
      />
      <Button title="회원가입" onPress={() => navigation.navigate('SignUp')} disabled={busy} color={t.colors.primary} />

      <Text style={{ marginTop: t.spacing.sm, color: t.colors.fgMuted, textAlign: 'center', fontSize: t.fontSize.body }}>
        또는 SNS로 로그인
      </Text>
      <Pressable
        style={[styles.socialBtn, { borderRadius: t.radius.md, padding: t.spacing.md }, styles.naver]}
        onPress={() => void onSocialLogin('naver')}
        disabled={busy}
      >
        <Text style={styles.socialText}>네이버 로그인</Text>
      </Pressable>
      <Pressable
        style={[styles.socialBtn, { borderRadius: t.radius.md, padding: t.spacing.md }, styles.google]}
        onPress={() => void onSocialLogin('google')}
        disabled={busy}
      >
        <Text style={styles.socialText}>구글 로그인</Text>
      </Pressable>
      <Pressable
        style={[styles.socialBtn, { borderRadius: t.radius.md, padding: t.spacing.md }, styles.kakao]}
        onPress={() => void onSocialLogin('kakao')}
        disabled={busy}
      >
        <Text style={[styles.socialText, styles.kakaoText]}>카카오 로그인</Text>
      </Pressable>

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
            disabled={busy}
            color={t.colors.primary}
          />
          <Button
            title="새 SNS 계정 생성"
            onPress={() => void onResolveConflict('separate')}
            disabled={busy}
            color={t.colors.primary}
          />
          <Button
            title="취소"
            onPress={() => {
              setConflictToken(null);
              setConflictEmail(null);
            }}
            disabled={busy}
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
            disabled={busy || !socialAgeConfirmed || !socialTermsAgreed || !socialPrivacyAgreed}
            color={t.colors.primary}
          />
        </View>
      ) : null}
    </View>
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
  box: { flex: 1, justifyContent: 'center' },
  input: { borderWidth: 1 },
  socialBtn: { alignItems: 'center' },
  socialText: { color: '#fff', fontWeight: '600' },
  naver: { backgroundColor: '#03c75a' },
  google: { backgroundColor: '#4285f4' },
  kakao: { backgroundColor: '#fee500' },
  kakaoText: { color: '#1f1f1f' },
  consentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  checkboxWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  checkbox: { width: 22, height: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
