import { Alert, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Segmented } from '../components/Segmented';
import { Card, CardTitle, PrimaryButton, ScreenLayout } from '../components/ui';
import { useTheme, useUserThemeMode, type ThemeMode } from '../theme';
import { clearTokens, getAccessToken } from '../authStorage';
import { deactivateAccount } from '../api';
import { useToast } from '../toast/useToast';
import type { RootStackParamList } from '../navigation';
import { NotificationCard } from './settings/NotificationCard';
import { DevToolsSection } from '../dev/DevPanel';
import { isDevBuild } from '../dev/devToggles';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
];

export function SettingsScreen() {
  const t = useTheme();
  const { userMode, setUserMode } = useUserThemeMode();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();

  const onWithdraw = () => {
    Alert.alert(
      '회원 탈퇴',
      '탈퇴하면 계정은 즉시 이용할 수 없게 됩니다. 데이터는 비활성화 후 1년이 지나면 완전히 삭제됩니다. 계속할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const token = await getAccessToken();
                if (!token) {
                  toast.show({ kind: 'error', message: '로그인 정보가 없어요. 다시 로그인해 주세요.' });
                  return;
                }
                await deactivateAccount(token);
                await clearTokens();
                toast.show({ kind: 'info', message: '탈퇴가 완료되었어요.' });
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
              } catch (e) {
                const msg = e instanceof Error ? e.message : '탈퇴 처리 중 오류가 발생했어요.';
                toast.show({ kind: 'error', message: msg });
              }
            })();
          },
        },
      ],
      { cancelable: true },
    );
  };

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
    <ScreenLayout title="설정" subtitle="프로필·테마·알림을 한 곳에서 관리해요.">
      <Card>
        <CardTitle>내 프로필</CardTitle>
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body }}>
          활동량·목표를 입력하면 권장 칼로리와 단백질 계산이 더 정확해집니다.
        </Text>
        <PrimaryButton title="프로필 편집" onPress={() => navigation.navigate('ProfileEdit')} />
      </Card>

      <Card>
        <CardTitle>테마</CardTitle>
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body }}>
          라이트와 다크 모드를 직접 선택할 수 있어요. 변경 즉시 반영되고 다음 실행에도 유지됩니다.
        </Text>
        <Segmented<ThemeMode>
          options={THEME_OPTIONS}
          value={userMode}
          onChange={(next) => setUserMode(next)}
        />
      </Card>

      <NotificationCard />

      <Card>
        <CardTitle>고객 지원</CardTitle>
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body }}>
          공지사항을 확인하거나 문의를 남길 수 있어요.
        </Text>
        <View style={{ gap: t.spacing.sm }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="공지사항 보기"
            onPress={() => navigation.navigate('NoticeList')}
            style={({ pressed }) => ({
              borderColor: t.colors.border,
              borderWidth: 1,
              borderRadius: t.radius.md,
              padding: t.spacing.md,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: t.colors.info, fontWeight: '700', fontSize: t.fontSize.body }}>공지사항</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="문의하기"
            onPress={() => navigation.navigate('InquiryList')}
            style={({ pressed }) => ({
              borderColor: t.colors.border,
              borderWidth: 1,
              borderRadius: t.radius.md,
              padding: t.spacing.md,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: t.colors.info, fontWeight: '700', fontSize: t.fontSize.body }}>문의하기</Text>
          </Pressable>
        </View>
      </Card>

      <Card>
        <CardTitle>약관 및 정책</CardTitle>
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body }}>
          게시 중인 이용약관과 개인정보처리방침을 확인할 수 있어요.
        </Text>
        <View style={{ gap: t.spacing.sm }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이용약관 보기"
            onPress={() => navigation.navigate('PolicyView', { kind: 'terms' })}
            style={({ pressed }) => ({
              borderColor: t.colors.border,
              borderWidth: 1,
              borderRadius: t.radius.md,
              padding: t.spacing.md,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: t.colors.info, fontWeight: '700', fontSize: t.fontSize.body }}>이용약관</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="개인정보처리방침 보기"
            onPress={() => navigation.navigate('PolicyView', { kind: 'privacy' })}
            style={({ pressed }) => ({
              borderColor: t.colors.border,
              borderWidth: 1,
              borderRadius: t.radius.md,
              padding: t.spacing.md,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: t.colors.info, fontWeight: '700', fontSize: t.fontSize.body }}>
              개인정보처리방침
            </Text>
          </Pressable>
        </View>
      </Card>

      {isDevBuild() ? (
        <Card>
          <CardTitle>개발자</CardTitle>
          <DevToolsSection />
        </Card>
      ) : null}

      <Card>
        <CardTitle>계정</CardTitle>
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body }}>
          로그아웃은 다음 진입 시 로그인 화면이 표시됩니다. 탈퇴 시 계정은 즉시 이용할 수 없으며, 데이터는 비활성화 후 1년이 지나면
          완전히 삭제됩니다. 자세한 내용은 개인정보처리방침을 참고해 주세요.
        </Text>
        <View style={{ gap: t.spacing.sm }}>
          <PrimaryButton title="로그아웃" onPress={onLogout} variant="danger" />
          <PrimaryButton title="회원 탈퇴" onPress={onWithdraw} variant="danger" />
        </View>
      </Card>
    </ScreenLayout>
  );
}
