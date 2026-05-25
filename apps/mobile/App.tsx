import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './src/authSession';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator, type InitialRoute } from './src/navigation';
import { refreshAccessToken } from './src/authRefresh';
import { clearTokens, getAccessToken } from './src/authStorage';
import { flushPendingLoginRedirect } from './src/authSession';
import { BootstrapLoading } from './src/components/BootstrapLoading';
import { resolveOnboardingComplete } from './src/lib/onboardingGate';
import { isAccessTokenValid } from './src/lib/sessionBootstrap';
import { ThemeProvider } from './src/theme';
import { DevTogglesProvider } from './src/dev/devToggles';
import { ToastProvider } from './src/toast/ToastProvider';
import { ensureMobileAdsInitialized } from './src/ads/initMobileAds';
import { setupNotifications } from './src/notifications/setup';

export default function App() {
  const [ready, setReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<InitialRoute>('Login');

  useEffect(() => {
    void setupNotifications();
    void ensureMobileAdsInitialized().catch((e) => {
      if (__DEV__) console.warn('[App] AdMob init failed', e);
    });

    void (async () => {
      try {
        let token = await getAccessToken();
        if (!token) {
          token = await refreshAccessToken();
        }
        if (!token) {
          setInitialRoute('Login');
        } else {
          let valid = await isAccessTokenValid(token);
          if (!valid) {
            token = await refreshAccessToken();
            valid = token != null && (await isAccessTokenValid(token));
          }
          if (!valid || !token) {
            await clearTokens();
            setInitialRoute('Login');
          } else {
            const done = await resolveOnboardingComplete(token);
            const nextToken = await getAccessToken();
            if (!nextToken) {
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

  return (
    <SafeAreaProvider>
      <DevTogglesProvider>
        <ThemeProvider>
          {!ready ? (
            <BootstrapLoading />
          ) : (
            <ToastProvider>
              <NavigationContainer ref={navigationRef} onReady={flushPendingLoginRedirect}>
                <RootNavigator initialRoute={initialRoute} />
              </NavigationContainer>
            </ToastProvider>
          )}
        </ThemeProvider>
      </DevTogglesProvider>
    </SafeAreaProvider>
  );
}
