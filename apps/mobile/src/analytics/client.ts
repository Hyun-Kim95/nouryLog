import * as Crypto from 'expo-crypto';
import * as Application from 'expo-application';
import {
  ANALYTICS_APP_NAME,
  analyticsEnvironment,
  isAnalyticsEnabled,
  posthogHost,
  posthogKey,
} from './config';

type EventProperties = Record<string, string | number | boolean | null | undefined>;

let distinctId: string | null = null;
let superProperties: EventProperties = {};
let initDone = false;

function devWarn(label: string, error: unknown) {
  if (__DEV__) console.warn(`[analytics] ${label}`, error);
}

async function newAnonymousDistinctId(): Promise<string> {
  return Crypto.randomUUID();
}

function mergeProperties(props?: EventProperties): EventProperties {
  const merged: EventProperties = {
    ...superProperties,
    app: ANALYTICS_APP_NAME,
    environment: analyticsEnvironment(),
  };
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value !== undefined) merged[key] = value;
    }
  }
  return merged;
}

async function ensureDistinctId(): Promise<string> {
  if (distinctId) return distinctId;
  distinctId = await newAnonymousDistinctId();
  return distinctId;
}

function sendPayload(body: Record<string, unknown>): void {
  if (!isAnalyticsEnabled()) return;

  const url = `${posthogHost}/i/v0/e/`;
  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch((e) => devWarn('send failed', e));
}

export async function initAnalyticsClient(): Promise<void> {
  if (initDone) return;
  initDone = true;

  if (!isAnalyticsEnabled()) return;

  try {
    distinctId = await newAnonymousDistinctId();
    const appVersion = Application.nativeApplicationVersion ?? 'unknown';
    superProperties = { app_version: appVersion };
  } catch (e) {
    devWarn('init failed', e);
  }
}

export function registerSuperProperties(props: EventProperties): void {
  superProperties = { ...superProperties, ...props };
}

export function identifyUser(userId: string): void {
  if (!isAnalyticsEnabled() || !userId) return;
  distinctId = userId;
}

export async function resetUser(): Promise<void> {
  if (!isAnalyticsEnabled()) {
    distinctId = null;
    return;
  }
  try {
    distinctId = await newAnonymousDistinctId();
  } catch (e) {
    devWarn('reset failed', e);
    distinctId = null;
  }
}

export function captureEvent(event: string, properties?: EventProperties): void {
  if (!isAnalyticsEnabled()) return;

  void (async () => {
    try {
      const id = await ensureDistinctId();
      sendPayload({
        token: posthogKey,
        event,
        properties: mergeProperties({
          distinct_id: id,
          ...properties,
        }),
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      devWarn('capture failed', e);
    }
  })();
}

export function trackScreenView(screenName: string): void {
  captureEvent('$screen_view', { screen_name: screenName });
}
