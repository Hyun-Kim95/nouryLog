import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OCR_FREE_LIMIT, STATS_STALE_HOURS } from './lib/config.js';

describe('lib/config', () => {
  it('default OCR limit matches PRD 무료 5회', () => {
    assert.ok(OCR_FREE_LIMIT >= 1);
    assert.equal(OCR_FREE_LIMIT, 5);
  });

  it('stale threshold hours has sane default', () => {
    assert.equal(STATS_STALE_HOURS, 6);
  });
});
