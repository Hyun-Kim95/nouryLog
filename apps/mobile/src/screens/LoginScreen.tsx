import { useState } from 'react';
import { Button, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { loginRequest, socialResolveConflictRequest, socialStartRequest, type SocialProvider } from '../api';
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

  const goAfterLogin = async () => {
    const done = await getOnboardingDone();
    navigation.reset({ index: 0, routes: [{ name: done ? 'Main' : 'Onboarding' }] });
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
        await saveTokens(query.accessToken, query.refreshToken);
        toast.show({ kind: 'success', message: 'SNS로 로그인했어요.' });
        await goAfterLogin();
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
      await saveTokens(tokens.accessToken, tokens.refreshToken);
      toast.show({
        kind: 'success',
        message: action === 'link' ? '기존 계정과 연결했어요.' : '새 계정으로 가입했어요.',
      });
      await goAfterLogin();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '계정 연결 처리 실패';
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
});
