import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { userStatsAggregationMeta } from './userStatsAggregationMeta.js';

describe('userStatsAggregationMeta', () => {
  it('uses request time and never marks user live stats as stale', () => {
    const now = new Date('2026-05-19T12:00:00.000Z');
    const meta = userStatsAggregationMeta(now);
    assert.equal(meta.aggregatedAt, now);
    assert.equal(meta.isStale, false);
    assert.equal(meta.staleHours, 0);
  });
});
