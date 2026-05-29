import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compareSemver, isSemverLessThan, parseSemver } from './semver';

describe('mobile semver', () => {
  it('parseSemver extracts numeric segments', () => {
    assert.deepEqual(parseSemver('1.0.0'), [1, 0, 0]);
    assert.equal(parseSemver('invalid'), null);
  });

  it('isSemverLessThan detects outdated versions', () => {
    assert.equal(isSemverLessThan('1.0.0', '1.1.0'), true);
    assert.equal(isSemverLessThan('1.1.0', '1.0.0'), false);
    assert.equal(isSemverLessThan('1.0.0', '1.0.0'), false);
    assert.equal(compareSemver('1.0.9', '1.1.0'), -1);
  });
});
