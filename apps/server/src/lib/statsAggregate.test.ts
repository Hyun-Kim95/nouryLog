import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { bucketChartSummary, countWindowRecordedDays } from './statsAggregate.js';
import { listStatsBuckets, sundayOfWeekYmd } from './statsPeriod.js';

describe('bucketChartSummary', () => {
  const weekTotal = { calories: 14000, protein: 700, carbohydrate: 0, fat: 0 };

  it('day range returns bucket sum unchanged', () => {
    const out = bucketChartSummary('day', weekTotal, 1);
    assert.equal(out.calories, 14000);
  });

  it('week range divides by recorded days in bucket', () => {
    const out = bucketChartSummary('week', weekTotal, 7);
    assert.equal(out.calories, 2000);
    assert.equal(out.protein, 100);
  });

  it('month range divides by recorded days in bucket', () => {
    const out = bucketChartSummary('month', weekTotal, 10);
    assert.equal(out.calories, 1400);
  });

  it('returns zero when no recorded days', () => {
    const out = bucketChartSummary('week', weekTotal, 0);
    assert.equal(out.calories, 0);
  });
});

describe('countWindowRecordedDays', () => {
  it('counts distinct KST days', () => {
    assert.equal(countWindowRecordedDays(['2026-05-17', '2026-05-18', '2026-05-19']), 3);
    assert.equal(countWindowRecordedDays(['2026-05-17', '2026-05-17']), 1);
  });
});

describe('week bucket grouping (Sun start)', () => {
  it('May 17–19 share one week bucket when anchor is May 19', () => {
    const buckets = listStatsBuckets('week', '2026-05-19');
    const anchorWeek = buckets[5]!;
    assert.equal(anchorWeek.date, sundayOfWeekYmd('2026-05-19'));
    assert.equal(anchorWeek.date, '2026-05-17');

    const weekStart = anchorWeek.from.getTime();
    const weekEnd = anchorWeek.toExclusive.getTime();
    for (const ymd of ['2026-05-17', '2026-05-18', '2026-05-19']) {
      const { y, m, d } = { y: 2026, m: 5, d: Number(ymd.slice(8, 10)) };
      const noon = new Date(Date.UTC(y, m - 1, d, 3, 0, 0));
      assert.ok(noon.getTime() >= weekStart && noon.getTime() < weekEnd, ymd);
    }
  });
});
