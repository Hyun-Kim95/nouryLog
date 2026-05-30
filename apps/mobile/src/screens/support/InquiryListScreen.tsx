import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchInquiries, type InquirySummary } from '../../api/inquiries';
import { isAuthDenied } from '../../api';
import { ensureAccessToken } from '../../authSession';
import { Banner, Card, PrimaryButton, ScreenLayout } from '../../components/ui';
import { useFocusReload } from '../../hooks/useFocusReload';
import { inquiryStatusLabel } from '../../lib/inquiryStatus';
import type { RootStackParamList } from '../../navigation';
import { logAppError, toUserMessage } from '../../lib/userFacingError';
import { useTheme } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'InquiryList'>;

export function InquiryListScreen({ navigation }: Props) {
  const t = useTheme();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<InquirySummary[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const token = await ensureAccessToken();
      if (!token) return;
      const res = await fetchInquiries(token);
      setItems(res.items);
    } catch (e) {
      if (isAuthDenied(e)) return;
      logAppError('[InquiryList] load', e);
      setErr(toUserMessage(e, { context: 'support', fallback: '문의 목록을 불러오지 못했어요.' }));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusReload(load);

  return (
    <ScreenLayout scroll={false}>
      <PrimaryButton title="새 문의 작성" onPress={() => navigation.navigate('InquiryCreate')} />
      {err ? (
        <Banner variant="danger" actionLabel="다시 시도" onAction={() => void load()}>
          {err}
        </Banner>
      ) : null}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={t.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: t.spacing.sm, paddingBottom: t.spacing.xxl }}
          ListEmptyComponent={
            !err ? (
              <Card>
                <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>
                  등록한 문의가 없어요.
                </Text>
              </Card>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('InquiryDetail', { id: item.id })}
            >
              <Card>
                <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }} numberOfLines={2}>
                  {item.subject}
                </Text>
                <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, marginTop: t.spacing.xs }}>
                  {inquiryStatusLabel(item.status)}
                  {item.answered ? ' · 답변 있음' : ''}
                </Text>
              </Card>
            </Pressable>
          )}
        />
      )}
    </ScreenLayout>
  );
}
