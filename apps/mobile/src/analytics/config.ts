/** Shared PostHog project — filter dashboard by app=nourylog */
export const ANALYTICS_APP_NAME = 'nourylog' as const;

const DEFAULT_HOST = 'https://us.i.posthog.com';

export const posthogKey = (process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '').trim();

export const posthogHost = (process.env.EXPO_PUBLIC_POSTHOG_HOST ?? DEFAULT_HOST).replace(/\/$/, '');

export function isAnalyticsEnabled(): boolean {
  return posthogKey.length > 0 && process.env.EXPO_PUBLIC_POSTHOG_ENABLED === 'true';
}

export function analyticsEnvironment(): 'production' | 'development' {
  return __DEV__ ? 'development' : 'production';
}
