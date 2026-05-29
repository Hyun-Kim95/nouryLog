import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compareSemver, parseSemver } from './lib/appVersion.js';

describe('lib/appVersion semver', () => {
  it('parseSemver extracts numeric segments', () => {
    assert.deepEqual(parseSemver('1.0.0'), [1, 0, 0]);
    assert.deepEqual(parseSemver(' 2.10.3-beta '), [2, 10, 3]);
    assert.equal(parseSemver('bad'), null);
  });

  it('compareSemver orders versions', () => {
    assert.equal(compareSemver('1.0.0', '1.0.1'), -1);
    assert.equal(compareSemver('1.1.0', '1.0.9'), 1);
    assert.equal(compareSemver('2.0.0', '2.0.0'), 0);
    assert.equal(compareSemver('x', '1.0.0'), null);
  });
});
