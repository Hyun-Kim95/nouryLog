import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../api';
import { getAccessToken } from '../authStorage';
import { useTheme } from '../theme';

export function SubscriptionScreen() {
  const t = useTheme();
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
    <View style={[styles.box, { backgroundColor: t.colors.bg, gap: t.spacing.md, padding: t.spacing.lg }]}>
      <Text style={{ color: t.colors.fg, fontSize: t.fontSize.title, fontWeight: '700' }}>구독 · 복구</Text>
      {msg ? <Text style={{ color: t.colors.info, fontSize: t.fontSize.body }}>{msg}</Text> : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => void checkout()}
        style={({ pressed }) => ({
          backgroundColor: t.colors.surface2,
          borderColor: t.colors.border,
          borderWidth: 1,
          borderRadius: t.radius.md,
          paddingVertical: t.spacing.md,
          alignItems: 'center',
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body }}>
          premium_monthly Checkout (스텁)
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => void restore()}
        style={({ pressed }) => ({
          backgroundColor: t.colors.surface2,
          borderColor: t.colors.border,
          borderWidth: 1,
          borderRadius: t.radius.md,
          paddingVertical: t.spacing.md,
          alignItems: 'center',
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body }}>Restore</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1 },
});
