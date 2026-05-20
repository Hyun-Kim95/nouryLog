import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  currentOcrPeriodKey,
  nextPaywallTriggerForQuota,
  ocrPeriodPatchIfNeeded,
  resolveOcrFreeLimitForUserCount,
} from './lib/ocrQuota.js';

describe('ocrQuota', () => {
  it('currentOcrPeriodKey returns YYYY-MM', () => {
    const key = currentOcrPeriodKey(new Date('2026-05-15T12:00:00+09:00'));
    assert.match(key, /^\d{4}-\d{2}$/);
  });

  it('resolveOcrFreeLimitForUserCount uses 10 at threshold and below', () => {
    assert.equal(resolveOcrFreeLimitForUserCount(0), 10);
    assert.equal(resolveOcrFreeLimitForUserCount(100), 10);
  });

  it('resolveOcrFreeLimitForUserCount uses 5 above threshold', () => {
    assert.equal(resolveOcrFreeLimitForUserCount(101), 5);
  });

  it('ocrPeriodPatchIfNeeded resets when month missing or changed', () => {
    assert.deepEqual(ocrPeriodPatchIfNeeded({ id: 'u1', freeOcrMonth: null, freeOcrUsed: 5 }, '2026-05'), {
      freeOcrMonth: '2026-05',
      freeOcrUsed: 0,
    });
    assert.deepEqual(
      ocrPeriodPatchIfNeeded({ id: 'u1', freeOcrMonth: '2026-04', freeOcrUsed: 3 }, '2026-05'),
      { freeOcrMonth: '2026-05', freeOcrUsed: 0 },
    );
    assert.equal(
      ocrPeriodPatchIfNeeded({ id: 'u1', freeOcrMonth: '2026-05', freeOcrUsed: 2 }, '2026-05'),
      null,
    );
  });

  it('nextPaywallTriggerForQuota respects limit', () => {
    assert.equal(nextPaywallTriggerForQuota(false, 0, 10), 'none');
    assert.equal(nextPaywallTriggerForQuota(false, 9, 10), 'ocr_remaining_1');
    assert.equal(nextPaywallTriggerForQuota(false, 10, 10), 'ocr_exhausted');
    assert.equal(nextPaywallTriggerForQuota(true, 10, 10), 'none');
  });
});
