import { useEffect, useMemo, useState } from 'react';
import { Button, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  getPolicyDocument,
  loginRequest,
  signupRequest,
  type ConsentVersions,
  type PolicyDocument,
  type PolicyKind,
} from '../api';
import { getOnboardingDone, saveTokens } from '../authStorage';
import type { RootStackParamList } from '../navigation';
import { useTheme } from '../theme';
import { useToast } from '../toast/useToast';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

type PolicyState = Record<PolicyKind, PolicyDocument | null>;

export function SignUpScreen({ navigation }: Props) {
  const t = useTheme();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [policies, setPolicies] = useState<PolicyState>({ terms: null, privacy: null });
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingPolicies(true);
    void (async () => {
      try {
        const [terms, privacy] = await Promise.all([getPolicyDocument('terms'), getPolicyDocument('privacy')]);
        if (!cancelled) setPolicies({ terms, privacy });
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : '정책 문서를 불러오지 못했어요.');
      } finally {
        if (!cancelled) setLoadingPolicies(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const consents = useMemo<ConsentVersions | null>(() => {
    if (!policies.terms || !policies.privacy) return null;
    return {
      terms: { version: policies.terms.version },
      privacy: { version: policies.privacy.version },
    };
  }, [policies]);

  const canSubmit =
    !busy &&
    !loadingPolicies &&
    Boolean(consents) &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    password === passwordConfirm &&
    ageConfirmed &&
    termsAgreed &&
    privacyAgreed;

  const goAfterLogin = async () => {
    const done = await getOnboardingDone();
    navigation.reset({ index: 0, routes: [{ name: done ? 'Main' : 'Onboarding' }] });
  };

  const onSubmit = async () => {
    if (!consents) return;
    setErr(null);
    setBusy(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await signupRequest({ email: normalizedEmail, password, ageConfirmed, consents });
      const tokens = await loginRequest(normalizedEmail, password);
      await saveTokens(tokens.accessToken, tokens.refreshToken);
      toast.show({ kind: 'success', message: '가입을 완료했어요.' });
      await goAfterLogin();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '회원가입 실패';
      setErr(msg);
      toast.show({ kind: 'error', message: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: t.colors.bg }]}
      contentContainerStyle={{ padding: t.spacing.lg, gap: t.spacing.md }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ gap: t.spacing.xs }}>
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.display, fontWeight: '700' }}>회원가입</Text>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>
          nouryLog 이용을 위해 필수 약관에 동의해 주세요.
        </Text>
      </View>

      {err ? <Text style={{ color: t.colors.danger, fontSize: t.fontSize.body }}>{err}</Text> : null}

      <TextInput
        style={[styles.input, { borderColor: t.colors.border, backgroundColor: t.colors.surface, color: t.colors.fg }]}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="이메일"
        placeholderTextColor={t.colors.fgSubtle}
      />
      <TextInput
        style={[styles.input, { borderColor: t.colors.border, backgroundColor: t.colors.surface, color: t.colors.fg }]}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder="비밀번호 (6자 이상)"
        placeholderTextColor={t.colors.fgSubtle}
      />
      <TextInput
        style={[styles.input, { borderColor: t.colors.border, backgroundColor: t.colors.surface, color: t.colors.fg }]}
        secureTextEntry
        value={passwordConfirm}
        onChangeText={setPasswordConfirm}
        placeholder="비밀번호 확인"
        placeholderTextColor={t.colors.fgSubtle}
      />

      <View
        style={[
          styles.card,
          { borderColor: t.colors.border, backgroundColor: t.colors.surface, borderRadius: t.radius.md },
        ]}
      >
        <ConsentRow label="만 14세 이상입니다." checked={ageConfirmed} onToggle={() => setAgeConfirmed((v) => !v)} />
        <ConsentRow
          label="이용약관에 동의합니다."
          checked={termsAgreed}
          onToggle={() => setTermsAgreed((v) => !v)}
          onView={() => navigation.navigate('PolicyView', { kind: 'terms' })}
        />
        <ConsentRow
          label="개인정보처리방침에 동의합니다."
          checked={privacyAgreed}
          onToggle={() => setPrivacyAgreed((v) => !v)}
          onView={() => navigation.navigate('PolicyView', { kind: 'privacy' })}
        />
        {loadingPolicies ? (
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>정책 버전을 확인하는 중...</Text>
        ) : null}
      </View>

      <Button title={busy ? '처리 중...' : '가입하기'} onPress={() => void onSubmit()} disabled={!canSubmit} />
    </ScrollView>
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
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={onToggle}
        style={styles.checkboxWrap}
      >
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
  root: { flex: 1 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12 },
  card: { borderWidth: 1, padding: 12, gap: 12 },
  consentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  checkboxWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  checkbox: { width: 22, height: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
