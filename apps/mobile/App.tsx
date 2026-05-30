import { useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { NavigationContainer, type NavigationState } from '@react-navigation/native';
import { navigationRef } from './src/authSession';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator, type InitialRoute } from './src/navigation';
import { refreshAccessToken } from './src/authRefresh';
import { clearTokens, getAccessToken, parseUserIdFromAccessToken } from './src/authStorage';
import { flushPendingLoginRedirect } from './src/authSession';
import { BootstrapLoading } from './src/components/BootstrapLoading';
import { UpdateModal } from './src/components/UpdateModal';
import { APP_UPDATE_COPY } from './src/copy/appUpdate';
import { resolveAppUpdateState, type AppUpdateState } from './src/lib/appUpdate';
import { resolveOnboardingComplete } from './src/lib/onboardingGate';
import { isAccessTokenValid } from './src/lib/sessionBootstrap';
import { ThemeProvider } from './src/theme';
import { DevTogglesProvider } from './src/dev/devToggles';
import { ToastProvider } from './src/toast/ToastProvider';
import { useToast } from './src/toast/useToast';
import { setAppUpdateDismissedVersion } from './src/userPrefs';
import { ensureMobileAdsInitialized } from './src/ads/initMobileAds';
import { setupNotifications } from './src/notifications/setup';
import { AnalyticsEvents, identifyAnalyticsUser, initAnalytics, track, trackScreen } from './src/analytics';
import { getActiveRouteName } from './src/analytics/navigationState';

function AppRoot({ initialRoute }: { initialRoute: InitialRoute }) {
  const toast = useToast();
  const [updateState, setUpdateState] = useState<AppUpdateState>({ kind: 'none' });
  const lastScreenRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    void resolveAppUpdateState().then(setUpdateState);
  }, []);

  const onNavigationStateChange = (state: NavigationState | undefined) => {
    const name = getActiveRouteName(state);
    if (!name || name === lastScreenRef.current) return;
    lastScreenRef.current = name;
    trackScreen(name);
  };

  const showUpdateModal = updateState.kind === 'required' || updateState.kind === 'optional';

  const handleUpdate = () => {
    const url = updateState.storeUrl;
    if (!url) return;
    void (async () => {
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (!canOpen) {
          toast.show({ kind: 'error', message: APP_UPDATE_COPY.storeOpenFailed });
          return;
        }
        await Linking.openURL(url);
      } catch (e) {
        if (__DEV__) console.warn('[App] open store failed', e);
        toast.show({ kind: 'error', message: APP_UPDATE_COPY.storeOpenFailed });
      }
    })();
  };

  const handleDismissLater = () => {
    const dismissKey = updateState.latestVersion;
    if (dismissKey) {
      void setAppUpdateDismissedVersion(dismissKey);
    }
    setUpdateState({ kind: 'none' });
  };

  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        onReady={flushPendingLoginRedirect}
        onStateChange={onNavigationStateChange}
      >
        <RootNavigator initialRoute={initialRoute} />
      </NavigationContainer>
      <UpdateModal
        visible={showUpdateModal}
        mode={updateState.kind === 'required' ? 'required' : 'optional'}
        message={updateState.message}
        onUpdate={handleUpdate}
        onDismissLater={updateState.kind === 'optional' ? handleDismissLater : undefined}
      />
    </>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<InitialRoute>('Login');
  const appOpenedTracked = useRef(false);

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
            const userId = parseUserIdFromAccessToken(token);
            if (userId) identifyAnalyticsUser(userId);
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
        initAnalytics();
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready || appOpenedTracked.current) return;
    appOpenedTracked.current = true;
    track(AnalyticsEvents.appOpened, { initial_route: initialRoute });
  }, [ready, initialRoute]);

  return (
    <SafeAreaProvider>
      <DevTogglesProvider>
        <ThemeProvider>
          {!ready ? (
            <BootstrapLoading />
          ) : (
            <ToastProvider>
              <AppRoot initialRoute={initialRoute} />
            </ToastProvider>
          )}
        </ThemeProvider>
      </DevTogglesProvider>
    </SafeAreaProvider>
  );
}
