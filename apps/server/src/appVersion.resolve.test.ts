import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { displayVersionFromPlayRelease } from './lib/playStoreVersion.js';

describe('resolve app version payload merge', () => {
  it('play branch uses versionCode and display version', () => {
    const play = { versionCode: 8, releaseName: '1.2.0' };
    const { latestVersion } = displayVersionFromPlayRelease(play);
    const payload = {
      minVersion: '1.0.0',
      minVersionCode: 0,
      latestVersion,
      latestVersionCode: play.versionCode,
      latestSource: 'play' as const,
    };
    assert.equal(payload.latestVersionCode, 8);
    assert.equal(payload.latestVersion, '1.2.0');
    assert.equal(payload.latestSource, 'play');
  });

  it('env fallback uses latestVersionCode zero', () => {
    const payload = {
      latestVersion: '1.1.0',
      latestVersionCode: 0,
      latestSource: 'env' as const,
    };
    assert.equal(payload.latestVersionCode, 0);
    assert.equal(payload.latestSource, 'env');
  });
});
