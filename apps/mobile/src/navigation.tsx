import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LoginScreen } from './screens/LoginScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LogScreen } from './screens/LogScreen';
import { StatsScreen } from './screens/StatsScreen';
import { SubscriptionScreen } from './screens/SubscriptionScreen';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tabs.Navigator>
      <Tabs.Screen name="Home" component={HomeScreen} options={{ title: '홈' }} />
      <Tabs.Screen name="Log" component={LogScreen} options={{ title: '기록' }} />
      <Tabs.Screen name="Stats" component={StatsScreen} options={{ title: '통계' }} />
      <Tabs.Screen name="Sub" component={SubscriptionScreen} options={{ title: '구독' }} />
    </Tabs.Navigator>
  );
}

export function RootNavigator({ initialLoggedIn }: { initialLoggedIn: boolean }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialLoggedIn ? 'Main' : 'Login'}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
    </Stack.Navigator>
  );
}
