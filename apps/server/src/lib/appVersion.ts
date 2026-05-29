import {
  APP_ANDROID_LATEST_VERSION,
  APP_ANDROID_MIN_VERSION,
  APP_ANDROID_MIN_VERSION_CODE,
  APP_ANDROID_STORE_URL,
} from './config.js';
import {
  displayVersionFromPlayRelease,
  fetchProductionLatestVersion,
} from './playStoreVersion.js';

export type SemverParts = [number, number, number];

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)/;

export function parseSemver(raw: string): SemverParts | null {
  const trimmed = raw.trim();
  const m = trimmed.match(SEMVER_RE);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function compareSemver(a: string, b: string): -1 | 0 | 1 | null {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return null;
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] < pb[i]) return -1;
    if (pa[i] > pb[i]) return 1;
  }
  return 0;
}

export type AppVersionPlatform = 'android';

export type AppVersionLatestSource = 'play' | 'env';

export type AppVersionPayload = {
  platform: AppVersionPlatform;
  minVersion: string;
  minVersionCode: number;
  latestVersion: string;
  latestVersionCode: number;
  latestSource: AppVersionLatestSource;
  storeUrl: string;
};

export function parseAppVersionPlatform(raw: unknown): AppVersionPlatform | null {
  if (raw === 'android') return 'android';
  return null;
}

export async function resolveAndroidAppVersionConfig(): Promise<
  | { ok: true; payload: AppVersionPayload }
  | { ok: false; reason: 'missing' | 'invalid' }
> {
  const minVersion = APP_ANDROID_MIN_VERSION;
  const minVersionCode = APP_ANDROID_MIN_VERSION_CODE;
  const storeUrl = APP_ANDROID_STORE_URL;
  const envLatestVersion = APP_ANDROID_LATEST_VERSION;

  if (!minVersion || !storeUrl) {
    return { ok: false, reason: 'missing' };
  }
  if (!parseSemver(minVersion)) {
    return { ok: false, reason: 'invalid' };
  }

  const play = await fetchProductionLatestVersion();
  if (play) {
    const { latestVersion } = displayVersionFromPlayRelease(play);
    return {
      ok: true,
      payload: {
        platform: 'android',
        minVersion,
        minVersionCode,
        latestVersion,
        latestVersionCode: play.versionCode,
        latestSource: 'play',
        storeUrl,
      },
    };
  }

  if (!parseSemver(envLatestVersion)) {
    return { ok: false, reason: 'invalid' };
  }
  const order = compareSemver(minVersion, envLatestVersion);
  if (order === null || order > 0) {
    return { ok: false, reason: 'invalid' };
  }

  return {
    ok: true,
    payload: {
      platform: 'android',
      minVersion,
      minVersionCode,
      latestVersion: envLatestVersion,
      latestVersionCode: 0,
      latestSource: 'env',
      storeUrl,
    },
  };
}
