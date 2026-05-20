import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { STATS_STALE_HOURS } from './lib/config.js';

describe('lib/config', () => {
  it('stale threshold hours has sane default', () => {
    assert.equal(STATS_STALE_HOURS, 6);
  });
});
