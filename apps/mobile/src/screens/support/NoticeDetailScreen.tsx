import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchNotice, type NoticeDetail } from '../../api/notices';
import { Banner, Card, CardTitle } from '../../components/ui';
import { useTheme } from '../../theme';
import type { RootStackParamList } from '../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'NoticeDetail'>;

export function NoticeDetailScreen({ route }: Props) {
  const t = useTheme();
  const { id } = route.params;
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void (async () => {
      try {
        const data = await fetchNotice(id);
        if (!cancelled) setNotice(data);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : '공지를 불러오지 못했어요.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.colors.bg }}>
        <ActivityIndicator color={t.colors.primary} />
      </View>
    );
  }

  if (err || !notice) {
    return (
      <View style={{ flex: 1, padding: t.spacing.lg, backgroundColor: t.colors.bg }}>
        <Banner variant="danger">{err ?? '공지를 찾을 수 없어요.'}</Banner>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.colors.bg }}
      contentContainerStyle={{ padding: t.spacing.lg, gap: t.spacing.md }}
    >
      <Card>
        <CardTitle>{notice.title}</CardTitle>
        <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>
          {new Date(notice.createdAt).toLocaleString('ko-KR')}
        </Text>
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, lineHeight: 24, marginTop: t.spacing.md }}>
          {notice.body}
        </Text>
      </Card>
    </ScrollView>
  );
}
