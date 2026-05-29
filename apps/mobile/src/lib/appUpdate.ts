import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { API_BASE } from '../config';
import { getAppUpdateDismissedVersion } from '../userPrefs';
import { isSemverLessThan } from './semver';

export type AppUpdateKind = 'none' | 'required' | 'optional';

export type AppUpdateState = {
  kind: AppUpdateKind;
  storeUrl?: string;
  /** 스누즈·표시용 (versionCode 문자열 또는 semver) */
  latestVersion?: string;
  message?: string;
};

type AppVersionResponse = {
  platform: 'android';
  minVersion: string;
  minVersionCode?: number;
  latestVersion: string;
  latestVersionCode?: number;
  latestSource?: 'play' | 'env';
  storeUrl: string;
  message?: string;
};

const VERSION_CHECK_TIMEOUT_MS = 8_000;

function getCurrentAppSemver(): string | null {
  const version = Application.nativeApplicationVersion?.trim();
  return version || null;
}

function getCurrentVersionCode(): number | null {
  const raw = Application.nativeBuildVersion?.trim();
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

async function fetchAppVersionConfig(): Promise<AppVersionResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VERSION_CHECK_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/public/app/version?platform=android`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as AppVersionResponse;
    if (
      json.platform !== 'android' ||
      typeof json.minVersion !== 'string' ||
      typeof json.latestVersion !== 'string' ||
      typeof json.storeUrl !== 'string'
    ) {
      return null;
    }
    return json;
  } catch (e) {
    if (__DEV__) console.warn('[appUpdate] version check failed', e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isForceUpdateRequired(
  config: AppVersionResponse,
  currentSemver: string,
  currentCode: number | null,
): boolean {
  const minCode = config.minVersionCode ?? 0;
  if (minCode > 0 && currentCode !== null && currentCode < minCode) {
    return true;
  }
  return isSemverLessThan(currentSemver, config.minVersion);
}

function getOptionalDismissKey(config: AppVersionResponse): string {
  const latestCode = config.latestVersionCode ?? 0;
  if (latestCode > 0) {
    return String(latestCode);
  }
  return config.latestVersion;
}

function isOptionalUpdateAvailable(
  config: AppVersionResponse,
  currentSemver: string,
  currentCode: number | null,
): boolean {
  const latestCode = config.latestVersionCode ?? 0;
  if (latestCode > 0 && currentCode !== null) {
    return currentCode < latestCode;
  }
  return isSemverLessThan(currentSemver, config.latestVersion);
}

export async function resolveAppUpdateState(): Promise<AppUpdateState> {
  if (__DEV__) return { kind: 'none' };
  if (Platform.OS !== 'android') return { kind: 'none' };

  const currentSemver = getCurrentAppSemver();
  if (!currentSemver) return { kind: 'none' };
  const currentCode = getCurrentVersionCode();

  const config = await fetchAppVersionConfig();
  if (!config) return { kind: 'none' };

  const { storeUrl, message } = config;
  const dismissKey = getOptionalDismissKey(config);
  const displayLatest = config.latestVersion;

  if (isForceUpdateRequired(config, currentSemver, currentCode)) {
    return { kind: 'required', storeUrl, latestVersion: displayLatest, message };
  }

  if (isOptionalUpdateAvailable(config, currentSemver, currentCode)) {
    const dismissed = await getAppUpdateDismissedVersion();
    if (dismissed === dismissKey) {
      return { kind: 'none' };
    }
    return { kind: 'optional', storeUrl, latestVersion: dismissKey, message };
  }

  return { kind: 'none' };
}
