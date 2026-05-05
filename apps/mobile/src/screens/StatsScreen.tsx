import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../api';
import { getAccessToken } from '../authStorage';

type Stats = {
  aggregatedAt: string;
  isStale: boolean;
  staleHours: number;
  timezone: string;
  summary: { calories: number; protein: number; carbohydrate: number; fat: number };
};

export function StatsScreen() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const token = await getAccessToken();
        if (!token) throw new Error('로그인 필요');
        const s = await apiFetch<Stats>('/stats?range=day', { token });
        setData(s);
      } catch (e) {
        setErr(e instanceof Error ? e.message : '오류');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>통계</Text>
      {err ? <Text style={styles.err}>{err}</Text> : null}
      {data?.isStale ? (
        <View style={styles.warn}>
          <Text>집계 지연 · staleHours {data.staleHours}</Text>
        </View>
      ) : null}
      {data && (
        <>
          <Text style={styles.body}>타임존 {data.timezone}</Text>
          <Text style={styles.body}>칼로리 합계 {data.summary.calories}</Text>
          <Text style={styles.body}>
            단백질 {data.summary.protein} · 탄수 {data.summary.carbohydrate} · 지방 {data.summary.fat}
          </Text>
          <Text style={styles.muted}>aggregatedAt {data.aggregatedAt}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  box: { flex: 1, padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: '700' },
  body: { fontSize: 16 },
  muted: { fontSize: 12, color: '#666' },
  err: { color: '#b91c1c' },
  warn: { padding: 10, backgroundColor: '#fffbeb', borderRadius: 8 },
});
