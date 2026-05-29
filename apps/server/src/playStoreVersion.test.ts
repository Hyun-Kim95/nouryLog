import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  displayVersionFromPlayRelease,
  maxVersionCodeFromReleases,
  parseVersionCode,
} from './lib/playStoreVersion.js';

describe('lib/playStoreVersion', () => {
  it('parseVersionCode accepts string and number', () => {
    assert.equal(parseVersionCode('6'), 6);
    assert.equal(parseVersionCode(7), 7);
    assert.equal(parseVersionCode('bad'), null);
  });

  it('maxVersionCodeFromReleases picks max from active releases', () => {
    const result = maxVersionCodeFromReleases([
      { status: 'completed', versionCodes: ['4', '5'], name: '1.0.0' },
      { status: 'draft', versionCodes: ['99'], name: 'draft' },
      { status: 'inProgress', versionCodes: ['6'], name: '1.1.0' },
    ]);
    assert.deepEqual(result, { versionCode: 6, releaseName: '1.1.0' });
  });

  it('maxVersionCodeFromReleases returns null when no active codes', () => {
    assert.equal(maxVersionCodeFromReleases([{ status: 'draft', versionCodes: ['1'] }]), null);
  });

  it('displayVersionFromPlayRelease uses semver name when valid', () => {
    const d = displayVersionFromPlayRelease({ versionCode: 6, releaseName: '1.1.0' });
    assert.equal(d.latestVersion, '1.1.0');
    assert.equal(d.usedSemverFromName, true);
  });

  it('displayVersionFromPlayRelease falls back to versionCode string', () => {
    const d = displayVersionFromPlayRelease({ versionCode: 6, releaseName: 'Release 6' });
    assert.equal(d.latestVersion, '6');
    assert.equal(d.usedSemverFromName, false);
  });
});
