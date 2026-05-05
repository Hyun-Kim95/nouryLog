import { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../api';
import { getAccessToken } from '../authStorage';

export function SubscriptionScreen() {
  const [msg, setMsg] = useState<string | null>(null);

  const checkout = async () => {
    setMsg(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('로그인 필요');
      await apiFetch('/me/billing/checkout', {
        method: 'POST',
        token,
        body: JSON.stringify({ productType: 'premium_monthly' }),
      });
      setMsg('checkout 스텁 완료 (OCR 유료 플래그 설정)');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '실패');
    }
  };

  const restore = async () => {
    setMsg(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('로그인 필요');
      await apiFetch('/me/billing/restore', { method: 'POST', token, body: JSON.stringify({}) });
      setMsg('복구 호출 완료');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '실패');
    }
  };

  return (
    <View style={styles.box}>
      <Text style={styles.title}>구독 · 복구</Text>
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}
      <Button title="premium_monthly Checkout (스텁)" onPress={() => void checkout()} />
      <Button title="Restore" onPress={() => void restore()} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  msg: { fontSize: 14, color: '#2563eb' },
});
