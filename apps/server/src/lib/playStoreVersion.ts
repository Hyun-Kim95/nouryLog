import { parseSemver } from './appVersion.js';
import { getAndroidPublisherClient, getPlayPackageName, isPlayServiceAccountConfigured } from './playAndroidPublisher.js';

const CACHE_TTL_MS = 10 * 60 * 1000;
const ACTIVE_RELEASE_STATUSES = new Set(['completed', 'inProgress']);

export type PlayTrackRelease = {
  name?: string | null;
  versionCodes?: Array<string | number> | null;
  status?: string | null;
};

export type PlayProductionVersion = {
  versionCode: number;
  releaseName: string | null;
};

let cache: { fetchedAt: number; value: PlayProductionVersion | null } | null = null;

function playVersionDebugEnabled(): boolean {
  return process.env.PLAY_VERSION_DEBUG === '1';
}

function logPlayVersion(message: string, detail?: unknown): void {
  if (!playVersionDebugEnabled()) return;
  if (detail !== undefined) {
    console.warn(`[playStoreVersion] ${message}`, detail);
  } else {
    console.warn(`[playStoreVersion] ${message}`);
  }
}

export function parseVersionCode(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null;
  return n;
}

export function maxVersionCodeFromReleases(releases: PlayTrackRelease[]): PlayProductionVersion | null {
  let maxCode = -1;
  let releaseName: string | null = null;

  for (const release of releases) {
    const status = release.status ?? '';
    if (!ACTIVE_RELEASE_STATUSES.has(status)) continue;

    const codes = release.versionCodes ?? [];
    for (const raw of codes) {
      const code = parseVersionCode(raw);
      if (code === null) continue;
      if (code > maxCode) {
        maxCode = code;
        const name = release.name?.trim();
        releaseName = name || null;
      } else if (code === maxCode && !releaseName) {
        const name = release.name?.trim();
        if (name) releaseName = name;
      }
    }
  }

  if (maxCode < 0) return null;
  return { versionCode: maxCode, releaseName };
}

export function displayVersionFromPlayRelease(
  play: PlayProductionVersion,
): { latestVersion: string; usedSemverFromName: boolean } {
  const name = play.releaseName?.trim();
  if (name && parseSemver(name)) {
    return { latestVersion: name, usedSemverFromName: true };
  }
  return { latestVersion: String(play.versionCode), usedSemverFromName: false };
}

async function fetchProductionVersionFromPlayUncached(): Promise<PlayProductionVersion | null> {
  const client = getAndroidPublisherClient();
  if (!client) return null;

  const packageName = getPlayPackageName();
  let editId: string | null | undefined;

  try {
    const edit = await client.edits.insert({ packageName });
    editId = edit.data.id;
    if (!editId) {
      logPlayVersion('edits.insert returned no editId');
      return null;
    }

    const { data } = await client.edits.tracks.get({
      packageName,
      editId,
      track: 'production',
    });
    const releases = (data.releases ?? []) as PlayTrackRelease[];
    return maxVersionCodeFromReleases(releases);
  } catch (e) {
    console.warn(
      '[playStoreVersion] production version fetch failed; falling back to env latest',
      e instanceof Error ? e.message : e,
    );
    logPlayVersion('production version fetch failed', e);
    return null;
  } finally {
    if (editId) {
      try {
        await client.edits.delete({ packageName, editId });
      } catch (deleteErr) {
        logPlayVersion('edits.delete failed', deleteErr);
      }
    }
  }
}

export async function fetchProductionLatestVersion(options?: {
  bypassCache?: boolean;
}): Promise<PlayProductionVersion | null> {
  if (!isPlayServiceAccountConfigured()) return null;

  const now = Date.now();
  if (!options?.bypassCache && cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.value;
  }

  const value = await fetchProductionVersionFromPlayUncached();
  cache = { fetchedAt: now, value };
  return value;
}

/** 테스트용 캐시 초기화 */
export function resetPlayStoreVersionCacheForTests(): void {
  cache = null;
}
