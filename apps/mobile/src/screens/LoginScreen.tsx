import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { loginRequest } from '../api';
import { saveTokens } from '../authStorage';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('user@example.com');
  const [password, setPassword] = useState('user123');
  const [err, setErr] = useState<string | null>(null);

  const onLogin = async () => {
    setErr(null);
    try {
      const tokens = await loginRequest(email.trim(), password);
      await saveTokens(tokens.accessToken, tokens.refreshToken);
      navigation.replace('Main');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '오류');
    }
  };

  return (
    <View style={styles.box}>
      <Text style={styles.title}>식단 관리</Text>
      <Text style={styles.hint}>시드: user@example.com / user123</Text>
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <TextInput style={styles.input} autoCapitalize="none" value={email} onChangeText={setEmail} placeholder="이메일" />
      <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} placeholder="비밀번호" />
      <Button title="로그인" onPress={() => void onLogin()} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  hint: { color: '#666', marginBottom: 8 },
  err: { color: '#b91c1c' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
});
