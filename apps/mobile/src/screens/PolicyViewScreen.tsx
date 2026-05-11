import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Markdown from 'react-native-markdown-display';
import { getPolicyDocument, type PolicyDocument } from '../api';
import type { RootStackParamList } from '../navigation';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PolicyView'>;

const TITLE_BY_KIND = {
  terms: '이용약관',
  privacy: '개인정보처리방침',
} as const;

export function PolicyViewScreen({ route }: Props) {
  const t = useTheme();
  const { kind } = route.params;
  const [doc, setDoc] = useState<PolicyDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const next = await getPolicyDocument(kind);
        if (!cancelled) setDoc(next);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '정책 문서를 불러오지 못했어요.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: t.colors.bg }]}
      contentContainerStyle={{ padding: t.spacing.lg, gap: t.spacing.md }}
    >
      <View style={{ gap: t.spacing.xs }}>
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.display, fontWeight: '700' }}>
          {TITLE_BY_KIND[kind]}
        </Text>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
          {doc ? `버전 ${doc.version} · 게시 ${doc.publishedAt.slice(0, 10)}` : '최신 게시 문서'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.colors.primary} />
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>불러오는 중...</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <View
          style={[
            styles.stateBox,
            { borderColor: t.colors.border, backgroundColor: t.colors.surface, borderRadius: t.radius.md },
          ]}
        >
          <Text style={{ color: t.colors.danger, fontSize: t.fontSize.body }}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && doc ? (
        <View
          style={[
            styles.markdownBox,
            { borderColor: t.colors.border, backgroundColor: t.colors.surface, borderRadius: t.radius.md },
          ]}
        >
          <Markdown
            style={{
              body: { color: t.colors.fg, fontSize: t.fontSize.body, lineHeight: 21 },
              heading1: { color: t.colors.fg, fontSize: t.fontSize.title, fontWeight: '700' },
              heading2: { color: t.colors.fg, fontSize: t.fontSize.bodyLg, fontWeight: '700' },
              bullet_list: { color: t.colors.fg },
              ordered_list: { color: t.colors.fg },
              table: { borderColor: t.colors.border },
              tr: { borderColor: t.colors.border },
              th: { color: t.colors.fg, borderColor: t.colors.border },
              td: { color: t.colors.fg, borderColor: t.colors.border },
              link: { color: t.colors.info },
            }}
          >
            {doc.body}
          </Markdown>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  stateBox: { borderWidth: 1, padding: 16 },
  markdownBox: { borderWidth: 1, padding: 16 },
});
