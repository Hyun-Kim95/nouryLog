import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeGoalRanges } from './recommendation.js';

describe('computeGoalRanges', () => {
  it('protein uses ±5% with minimum 5g margin', () => {
    const r = computeGoalRanges(100, 2000, 'maintain');
    assert.equal(r.proteinGoalMinG, 95);
    assert.equal(r.proteinGoalMaxG, 105);
  });

  it('maintain calorie uses ±10%', () => {
    const r = computeGoalRanges(80, 2000, 'maintain');
    assert.equal(r.calorieGoalMinKcal, 1800);
    assert.equal(r.calorieGoalMaxKcal, 2200);
  });

  it('lose calorie is asymmetric', () => {
    const r = computeGoalRanges(80, 2000, 'lose');
    assert.equal(r.calorieGoalMinKcal, 1800);
    assert.equal(r.calorieGoalMaxKcal, 2000);
  });

  it('gain calorie is asymmetric', () => {
    const r = computeGoalRanges(80, 2000, 'gain');
    assert.equal(r.calorieGoalMinKcal, 2000);
    assert.equal(r.calorieGoalMaxKcal, 2200);
  });
});
