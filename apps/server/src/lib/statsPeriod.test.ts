import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysYmd,
  boundsForRange,
  isPeriodInFuture,
  kstMidnightUtc,
  parseAnchorDate,
  todayAnchorKst,
} from './statsPeriod.js';

describe('statsPeriod', () => {
  it('parseAnchorDate accepts YYYY-MM-DD', () => {
    assert.equal(parseAnchorDate('2026-05-16'), '2026-05-16');
    assert.equal(parseAnchorDate('2024-02-29'), '2024-02-29');
    assert.equal(parseAnchorDate('2026-02-30'), null);
    assert.equal(parseAnchorDate('bad'), null);
  });

  it('kstMidnightUtc maps KST day start to UTC', () => {
    const from = kstMidnightUtc(2026, 5, 16);
    assert.equal(from.toISOString(), '2026-05-15T15:00:00.000Z');
    const to = kstMidnightUtc(2026, 5, 17);
    assert.equal(to.toISOString(), '2026-05-16T15:00:00.000Z');
  });

  it('boundsForRange day is one KST calendar day', () => {
    const b = boundsForRange('day', '2026-05-16');
    assert.equal(b.from.toISOString(), '2026-05-15T15:00:00.000Z');
    assert.equal(b.toExclusive.toISOString(), '2026-05-16T15:00:00.000Z');
    assert.match(b.label, /2026년 5월 16일/);
  });

  it('boundsForRange week is Mon–Sun containing anchor', () => {
    const b = boundsForRange('week', '2026-05-16');
    assert.equal(b.from.toISOString(), '2026-05-10T15:00:00.000Z');
    assert.equal(b.toExclusive.toISOString(), '2026-05-17T15:00:00.000Z');
    assert.match(b.label, /5월 11일 – 5월 17일/);
  });

  it('boundsForRange month covers full KST month', () => {
    const b = boundsForRange('month', '2026-05-10');
    assert.equal(b.from.toISOString(), '2026-04-30T15:00:00.000Z');
    assert.equal(b.toExclusive.toISOString(), '2026-05-31T15:00:00.000Z');
    assert.equal(b.label, '2026년 5월');
  });

  it('isPeriodInFuture rejects tomorrow and later', () => {
    const today = '2026-05-16';
    const tomorrow = boundsForRange('day', '2026-05-17');
    assert.equal(isPeriodInFuture(tomorrow.from, today), true);
    const todayBounds = boundsForRange('day', today);
    assert.equal(isPeriodInFuture(todayBounds.from, today), false);
  });

  it('addDaysYmd crosses month boundary', () => {
    assert.equal(addDaysYmd('2026-05-31', 1), '2026-06-01');
  });

  it('todayAnchorKst uses fixed instant', () => {
    const noonUtcMay15 = new Date('2026-05-15T20:00:00.000Z');
    assert.equal(todayAnchorKst(noonUtcMay15), '2026-05-16');
  });
});
