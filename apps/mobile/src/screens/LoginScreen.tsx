import { useState } from 'react';
import { Button, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { loginRequest, socialResolveConflictRequest, socialStartRequest, type SocialProvider } from '../api';
import { saveTokens } from '../authStorage';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;
WebBrowser.maybeCompleteAuthSession();

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('user@example.com');
  const [password, setPassword] = useState('user123');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [conflictToken, setConflictToken] = useState<string | null>(null);
  const [conflictEmail, setConflictEmail] = useState<string | null>(null);

  const onLogin = async () => {
    setErr(null);
    setBusy(true);
    try {
      const tokens = await loginRequest(email.trim(), password);
      await saveTokens(tokens.accessToken, tokens.refreshToken);
      navigation.replace('Main');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '오류');
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
        setErr('SNS 로그인이 취소되었습니다.');
        return;
      }
      const parsed = Linking.parse(result.url);
      const query = parsed.queryParams as Record<string, string | undefined>;
      if (query.result === 'success' && query.accessToken && query.refreshToken) {
        await saveTokens(query.accessToken, query.refreshToken);
        navigation.replace('Main');
        return;
      }
      if (query.result === 'conflict' && query.conflictToken) {
        setConflictToken(query.conflictToken);
        setConflictEmail(query.email ?? null);
        return;
      }
      setErr(query.message ?? 'SNS 로그인 실패');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'SNS 로그인 실패');
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
      navigation.replace('Main');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '계정 연결 처리 실패');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.box}>
      <Text style={styles.title}>식단 관리</Text>
      <Text style={styles.hint}>시드: user@example.com / user123</Text>
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <TextInput style={styles.input} autoCapitalize="none" value={email} onChangeText={setEmail} placeholder="이메일" />
      <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} placeholder="비밀번호" />
      <Button title={busy ? '처리 중...' : '로그인'} onPress={() => void onLogin()} disabled={busy} />

      <Text style={styles.sep}>또는 SNS로 로그인</Text>
      <Pressable style={[styles.socialBtn, styles.naver]} onPress={() => void onSocialLogin('naver')} disabled={busy}>
        <Text style={styles.socialText}>네이버 로그인</Text>
      </Pressable>
      <Pressable style={[styles.socialBtn, styles.google]} onPress={() => void onSocialLogin('google')} disabled={busy}>
        <Text style={styles.socialText}>구글 로그인</Text>
      </Pressable>
      <Pressable style={[styles.socialBtn, styles.kakao]} onPress={() => void onSocialLogin('kakao')} disabled={busy}>
        <Text style={[styles.socialText, styles.kakaoText]}>카카오 로그인</Text>
      </Pressable>

      {conflictToken ? (
        <View style={styles.conflictBox}>
          <Text style={styles.conflictTitle}>기존 계정과 이메일이 충돌합니다.</Text>
          <Text style={styles.conflictDesc}>{conflictEmail ? `대상: ${conflictEmail}` : '대상 이메일 확인 불가'}</Text>
          <Button title="기존 계정 연결" onPress={() => void onResolveConflict('link')} disabled={busy} />
          <Button title="새 SNS 계정 생성" onPress={() => void onResolveConflict('separate')} disabled={busy} />
          <Button
            title="취소"
            onPress={() => {
              setConflictToken(null);
              setConflictEmail(null);
            }}
            disabled={busy}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  hint: { color: '#666', marginBottom: 8 },
  err: { color: '#b91c1c' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  sep: { marginTop: 8, color: '#666', textAlign: 'center' },
  socialBtn: { borderRadius: 8, padding: 12, alignItems: 'center' },
  socialText: { color: '#fff', fontWeight: '600' },
  naver: { backgroundColor: '#03c75a' },
  google: { backgroundColor: '#4285f4' },
  kakao: { backgroundColor: '#fee500' },
  kakaoText: { color: '#1f1f1f' },
  conflictBox: { marginTop: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, gap: 8 },
  conflictTitle: { fontWeight: '700' },
  conflictDesc: { color: '#666' },
});
