import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LoginScreen } from './screens/LoginScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LogScreen } from './screens/LogScreen';
import { StatsScreen } from './screens/StatsScreen';
import { SubscriptionScreen } from './screens/SubscriptionScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { ProfileEditScreen } from './screens/ProfileEditScreen';
import { PolicyViewScreen } from './screens/PolicyViewScreen';
import { SignUpScreen } from './screens/SignUpScreen';
import { useTheme } from './theme';

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Onboarding: undefined;
  Main: undefined;
  ProfileEdit: undefined;
  PolicyView: { kind: 'terms' | 'privacy' };
};

export type InitialRoute = 'Login' | 'Onboarding' | 'Main';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/// 5탭 Ionicons 매핑. focused → filled 글리프 / unfocused → outline 글리프.
/// `@expo/vector-icons`의 Ionicons 셋을 사용하며, tintColor는 `tabBarActiveTintColor`/`tabBarInactiveTintColor`가 위임 처리.
/// Phase L의 텍스트 이모지 매핑을 대체.
const TAB_ICON: Record<string, { focused: IoniconName; unfocused: IoniconName }> = {
  Home: { focused: 'home', unfocused: 'home-outline' },
  Log: { focused: 'restaurant', unfocused: 'restaurant-outline' },
  Stats: { focused: 'stats-chart', unfocused: 'stats-chart-outline' },
  Sub: { focused: 'card', unfocused: 'card-outline' },
  Settings: { focused: 'settings', unfocused: 'settings-outline' },
};

function MainTabs() {
  const t = useTheme();
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const pair = TAB_ICON[route.name];
          const name = pair ? (focused ? pair.focused : pair.unfocused) : 'ellipse-outline';
          return <Ionicons name={name} size={size ?? 22} color={color} />;
        },
        tabBarActiveTintColor: t.colors.primary,
        tabBarInactiveTintColor: t.colors.fgMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: t.colors.bg,
          borderTopColor: t.colors.border,
        },
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} options={{ title: '홈' }} />
      <Tabs.Screen name="Log" component={LogScreen} options={{ title: '기록' }} />
      <Tabs.Screen name="Stats" component={StatsScreen} options={{ title: '통계' }} />
      <Tabs.Screen name="Sub" component={SubscriptionScreen} options={{ title: '구독' }} />
      <Tabs.Screen name="Settings" component={SettingsScreen} options={{ title: '설정' }} />
    </Tabs.Navigator>
  );
}

export function RootNavigator({ initialRoute }: { initialRoute: InitialRoute }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ headerShown: true, title: '회원가입' }}
      />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{ headerShown: true, title: '프로필 편집' }}
      />
      <Stack.Screen
        name="PolicyView"
        component={PolicyViewScreen}
        options={{ headerShown: true, title: '정책 문서' }}
      />
    </Stack.Navigator>
  );
}
