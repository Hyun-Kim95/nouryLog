import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator, type InitialRoute } from './src/navigation';
import { getAccessToken, getOnboardingDone } from './src/authStorage';
import { ThemeProvider } from './src/theme';
import { DevTogglesProvider } from './src/dev/devToggles';
import { DevPanel } from './src/dev/DevPanel';
import { ToastProvider } from './src/toast/ToastProvider';
import { setupNotifications } from './src/notifications/setup';

export default function App() {
  const [ready, setReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<InitialRoute>('Login');

  useEffect(() => {
    void (async () => {
      await setupNotifications();
      const token = await getAccessToken();
      if (!token) {
        setInitialRoute('Login');
      } else {
        const done = await getOnboardingDone();
        setInitialRoute(done ? 'Main' : 'Onboarding');
      }
      setReady(true);
    })();
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <DevTogglesProvider>
        <ThemeProvider>
          <ToastProvider>
            <NavigationContainer>
              <RootNavigator initialRoute={initialRoute} />
              <DevPanel />
            </NavigationContainer>
          </ToastProvider>
        </ThemeProvider>
      </DevTogglesProvider>
    </SafeAreaProvider>
  );
}
