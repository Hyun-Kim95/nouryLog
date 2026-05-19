import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { bucketChartSummary } from './statsAggregate.js';

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
