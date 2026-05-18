import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchInquiry, type InquiryDetail } from '../../api/inquiries';
import { isAuthDenied } from '../../api';
import { ensureAccessToken } from '../../authSession';
import { Banner, Card, CardTitle } from '../../components/ui';
import { inquiryStatusLabel } from '../../lib/inquiryStatus';
import type { RootStackParamList } from '../../navigation';
import { useTheme } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'InquiryDetail'>;

export function InquiryDetailScreen({ route }: Props) {
  const t = useTheme();
  const { id } = route.params;
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [inquiry, setInquiry] = useState<InquiryDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void (async () => {
      try {
        const token = await ensureAccessToken();
        if (!token) return;
        const data = await fetchInquiry(token, id);
        if (!cancelled) setInquiry(data);
      } catch (e) {
        if (isAuthDenied(e)) return;
        if (!cancelled) setErr(e instanceof Error ? e.message : '문의를 불러오지 못했어요.');
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

  if (err || !inquiry) {
    return (
      <View style={{ flex: 1, padding: t.spacing.lg, backgroundColor: t.colors.bg }}>
        <Banner variant="danger">{err ?? '문의를 찾을 수 없어요.'}</Banner>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.colors.bg }}
      contentContainerStyle={{ padding: t.spacing.lg, gap: t.spacing.md }}
    >
      <Card>
        <CardTitle>{inquiry.subject}</CardTitle>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
          {inquiryStatusLabel(inquiry.status)} · {new Date(inquiry.createdAt).toLocaleString('ko-KR')}
        </Text>
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, lineHeight: 22, marginTop: t.spacing.md }}>
          {inquiry.body}
        </Text>
      </Card>
      {inquiry.answer ? (
        <Card>
          <CardTitle>답변</CardTitle>
          {inquiry.answeredAt ? (
            <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>
              {new Date(inquiry.answeredAt).toLocaleString('ko-KR')}
            </Text>
          ) : null}
          <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, lineHeight: 22, marginTop: t.spacing.sm }}>
            {inquiry.answer}
          </Text>
        </Card>
      ) : (
        <Card>
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>답변을 준비 중이에요.</Text>
        </Card>
      )}
    </ScrollView>
  );
}
