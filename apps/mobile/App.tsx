import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './src/authSession';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator, type InitialRoute } from './src/navigation';
import { clearTokens, getAccessToken } from './src/authStorage';
import { flushPendingLoginRedirect } from './src/authSession';
import { resolveOnboardingComplete } from './src/lib/onboardingGate';
import { isAccessTokenValid } from './src/lib/sessionBootstrap';
import { ThemeProvider } from './src/theme';
import { DevTogglesProvider } from './src/dev/devToggles';
import { ToastProvider } from './src/toast/ToastProvider';
import { setupNotifications } from './src/notifications/setup';

export default function App() {
  const [ready, setReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<InitialRoute>('Login');

  useEffect(() => {
    void (async () => {
      try {
        await setupNotifications();
        let token = await getAccessToken();
        if (!token) {
          setInitialRoute('Login');
        } else {
          const valid = await isAccessTokenValid(token);
          if (!valid) {
            await clearTokens();
            setInitialRoute('Login');
          } else {
            const done = await resolveOnboardingComplete(token);
            token = await getAccessToken();
            if (!token) {
              setInitialRoute('Login');
            } else {
              setInitialRoute(done ? 'Main' : 'Onboarding');
            }
          }
        }
      } catch (e) {
        if (__DEV__) console.warn('[App] bootstrap failed', e);
        setInitialRoute('Login');
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <DevTogglesProvider>
        <ThemeProvider>
          <ToastProvider>
            <NavigationContainer ref={navigationRef} onReady={flushPendingLoginRedirect}>
              <RootNavigator initialRoute={initialRoute} />
            </NavigationContainer>
          </ToastProvider>
        </ThemeProvider>
      </DevTogglesProvider>
    </SafeAreaProvider>
  );
}
