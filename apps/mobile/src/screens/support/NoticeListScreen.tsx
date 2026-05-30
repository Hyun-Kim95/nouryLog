import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchNotices, type NoticeSummary } from '../../api/notices';
import { Banner, Card, ScreenLayout } from '../../components/ui';
import type { RootStackParamList } from '../../navigation';
import { useFocusReload } from '../../hooks/useFocusReload';
import { logAppError, toUserMessage } from '../../lib/userFacingError';
import { useTheme } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'NoticeList'>;

export function NoticeListScreen({ navigation }: Props) {
  const t = useTheme();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<NoticeSummary[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetchNotices();
      setItems(res.items);
    } catch (e) {
      logAppError('[NoticeList] load', e);
      setErr(toUserMessage(e, { context: 'support', fallback: '공지를 불러오지 못했어요.' }));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusReload(load);

  return (
    <ScreenLayout scroll={false}>
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
                  등록된 공지가 없어요.
                </Text>
              </Card>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('NoticeDetail', { id: item.id })}
            >
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs }}>
                  {item.pinned ? (
                    <Text style={{ color: t.colors.primary, fontSize: t.fontSize.caption, fontWeight: '700' }}>
                      고정
                    </Text>
                  ) : null}
                  <Text
                    style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600', flex: 1 }}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                </View>
                <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption, marginTop: t.spacing.xs }}>
                  {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                </Text>
              </Card>
            </Pressable>
          )}
        />
      )}
    </ScreenLayout>
  );
}
