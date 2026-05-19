import type { ComponentProps } from 'react';
import { useCallback } from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { AdsGateProvider, useAdsGate } from './ads/AdsGateContext';
import { AppTabBar } from './navigation/AppTabBar';
import { LoginScreen } from './screens/LoginScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LogScreen } from './screens/LogScreen';
import { StatsScreen } from './screens/StatsScreen';
import { SubscriptionScreen } from './screens/SubscriptionScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { ProfileEditScreen } from './screens/ProfileEditScreen';
import { PolicyViewScreen } from './screens/PolicyViewScreen';
import { NoticeListScreen } from './screens/support/NoticeListScreen';
import { NoticeDetailScreen } from './screens/support/NoticeDetailScreen';
import { InquiryListScreen } from './screens/support/InquiryListScreen';
import { InquiryCreateScreen } from './screens/support/InquiryCreateScreen';
import { InquiryDetailScreen } from './screens/support/InquiryDetailScreen';
import { themedStackScreenOptions } from './navigation/themedStackOptions';
import { useTheme } from './theme';

export type RootStackParamList = {
  Login: undefined;
  Onboarding: undefined;
  Main: undefined;
  ProfileEdit: undefined;
  PolicyView: { kind: 'terms' | 'privacy' };
  NoticeList: undefined;
  NoticeDetail: { id: string };
  InquiryList: undefined;
  InquiryCreate: undefined;
  InquiryDetail: { id: string };
};

export type InitialRoute = 'Login' | 'Onboarding' | 'Main';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const TAB_ICON: Record<string, { focused: IoniconName; unfocused: IoniconName }> = {
  Home: { focused: 'home', unfocused: 'home-outline' },
  Log: { focused: 'restaurant', unfocused: 'restaurant-outline' },
  Stats: { focused: 'stats-chart', unfocused: 'stats-chart-outline' },
  Sub: { focused: 'card', unfocused: 'card-outline' },
  Settings: { focused: 'settings', unfocused: 'settings-outline' },
};

function MainTabsInner() {
  const t = useTheme();
  const { refresh } = useAdsGate();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const pair = TAB_ICON[route.name];
          const name = pair ? (focused ? pair.focused : pair.unfocused) : 'ellipse-outline';
          return <Ionicons name={name} size={size ?? 24} color={color} />;
        },
        tabBarActiveTintColor: t.colors.primary,
        tabBarInactiveTintColor: t.colors.fgMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarItemStyle: {
          paddingVertical: Platform.OS === 'android' ? 4 : 2,
        },
        tabBarStyle: {
          backgroundColor: t.colors.bg,
          borderTopWidth: 0,
        },
      })}
      tabBar={(props) => <AppTabBar {...props} />}
    >
      <Tabs.Screen name="Home" component={HomeScreen} options={{ title: '홈' }} />
      <Tabs.Screen name="Log" component={LogScreen} options={{ title: '기록' }} />
      <Tabs.Screen name="Stats" component={StatsScreen} options={{ title: '통계' }} />
      <Tabs.Screen name="Sub" component={SubscriptionScreen} options={{ title: '구독' }} />
      <Tabs.Screen name="Settings" component={SettingsScreen} options={{ title: '설정' }} />
    </Tabs.Navigator>
  );
}

function MainTabs() {
  return (
    <AdsGateProvider>
      <MainTabsInner />
    </AdsGateProvider>
  );
}

export function RootNavigator({ initialRoute }: { initialRoute: InitialRoute }) {
  const t = useTheme();
  const themed = themedStackScreenOptions(t);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{ ...themed, headerShown: true, title: '프로필 편집' }}
      />
      <Stack.Screen
        name="PolicyView"
        component={PolicyViewScreen}
        options={({ route }) => ({
          ...themed,
          headerShown: true,
          title: route.params.kind === 'terms' ? '이용약관' : '개인정보처리방침',
        })}
      />
      <Stack.Screen
        name="NoticeList"
        component={NoticeListScreen}
        options={{ ...themed, headerShown: true, title: '공지사항' }}
      />
      <Stack.Screen
        name="NoticeDetail"
        component={NoticeDetailScreen}
        options={{ ...themed, headerShown: true, title: '공지' }}
      />
      <Stack.Screen
        name="InquiryList"
        component={InquiryListScreen}
        options={{ ...themed, headerShown: true, title: '문의하기' }}
      />
      <Stack.Screen
        name="InquiryCreate"
        component={InquiryCreateScreen}
        options={{ ...themed, headerShown: true, title: '문의 작성' }}
      />
      <Stack.Screen
        name="InquiryDetail"
        component={InquiryDetailScreen}
        options={{ ...themed, headerShown: true, title: '문의 상세' }}
      />
    </Stack.Navigator>
  );
}
