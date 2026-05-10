import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Segmented } from '../components/Segmented';
import { useTheme, useUserThemeMode, type ThemeMode } from '../theme';
import { clearTokens } from '../authStorage';
import { useToast } from '../toast/useToast';
import type { RootStackParamList } from '../navigation';
import { NotificationCard } from './settings/NotificationCard';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
];

export function SettingsScreen() {
  const t = useTheme();
  const { userMode, setUserMode } = useUserThemeMode();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();

  const onLogout = () => {
    Alert.alert(
      '로그아웃하시겠어요?',
      '다음 진입 시 로그인 화면이 표시됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await clearTokens();
                toast.show({ kind: 'info', message: '로그아웃했어요.' });
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
              } catch (e) {
                const msg = e instanceof Error ? e.message : '로그아웃 처리 중 오류가 발생했어요.';
                toast.show({ kind: 'error', message: msg });
              }
            })();
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: t.colors.bg }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: t.spacing.lg,
          paddingTop: t.spacing.lg,
          paddingBottom: t.spacing.xxl,
          gap: t.spacing.md,
        }}
      >
        <View style={{ gap: t.spacing.xs }}>
          <Text style={{ color: t.colors.fg, fontSize: t.fontSize.display, fontWeight: '700' }}>
            설정
          </Text>
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>
            프로필·테마·알림을 한 곳에서 관리해요.
          </Text>
        </View>

        <View
          style={{
            padding: t.spacing.md,
            borderRadius: t.radius.md,
            borderColor: t.colors.border,
            borderWidth: 1,
            backgroundColor: t.colors.surface,
            gap: t.spacing.sm,
          }}
        >
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, fontWeight: '700' }}>
            내 프로필
          </Text>
          <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body }}>
            활동량·목표를 입력하면 권장 칼로리와 단백질 계산이 더 정확해집니다.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="프로필 편집"
            onPress={() => navigation.navigate('ProfileEdit')}
            style={({ pressed }) => ({
              backgroundColor: t.colors.primary,
              borderRadius: t.radius.md,
              paddingVertical: t.spacing.md,
              alignItems: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: t.colors.primaryFg, fontWeight: '700', fontSize: t.fontSize.body }}>
              프로필 편집
            </Text>
          </Pressable>
        </View>

        <View
          style={{
            padding: t.spacing.md,
            borderRadius: t.radius.md,
            borderColor: t.colors.border,
            borderWidth: 1,
            backgroundColor: t.colors.surface,
            gap: t.spacing.sm,
          }}
        >
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, fontWeight: '700' }}>
            테마
          </Text>
          <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body }}>
            라이트와 다크 모드를 직접 선택할 수 있어요. 변경 즉시 반영되고 다음 실행에도 유지됩니다.
          </Text>
          <Segmented<ThemeMode>
            options={THEME_OPTIONS}
            value={userMode}
            onChange={(next) => setUserMode(next)}
          />
        </View>

        <NotificationCard />

        <View
          style={{
            padding: t.spacing.md,
            borderRadius: t.radius.md,
            borderColor: t.colors.border,
            borderWidth: 1,
            backgroundColor: t.colors.surface,
            gap: t.spacing.sm,
          }}
        >
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, fontWeight: '700' }}>
            계정
          </Text>
          <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body }}>
            로그인된 계정에서 로그아웃해요. 다음 진입 시 로그인 화면이 표시됩니다.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="로그아웃"
            onPress={onLogout}
            style={({ pressed }) => ({
              backgroundColor: t.colors.danger,
              borderRadius: t.radius.md,
              paddingVertical: t.spacing.md,
              alignItems: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text
              style={{ color: t.colors.dangerFg, fontWeight: '700', fontSize: t.fontSize.body }}
            >
              로그아웃
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
