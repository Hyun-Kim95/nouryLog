import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateRecommendationFull, computeGoalRanges } from './recommendation.js';

describe('computeGoalRanges', () => {
  it('protein uses ±5% with minimum 5g margin', () => {
    const r = computeGoalRanges(100, 2000, 250, 70, 'maintain');
    assert.equal(r.proteinGoalMinG, 95);
    assert.equal(r.proteinGoalMaxG, 105);
  });

  it('maintain calorie uses ±10%', () => {
    const r = computeGoalRanges(80, 2000, 250, 70, 'maintain');
    assert.equal(r.calorieGoalMinKcal, 1800);
    assert.equal(r.calorieGoalMaxKcal, 2200);
  });

  it('lose calorie is asymmetric', () => {
    const r = computeGoalRanges(80, 2000, 250, 70, 'lose');
    assert.equal(r.calorieGoalMinKcal, 1800);
    assert.equal(r.calorieGoalMaxKcal, 2000);
  });

  it('gain calorie is asymmetric', () => {
    const r = computeGoalRanges(80, 2000, 250, 70, 'gain');
    assert.equal(r.calorieGoalMinKcal, 2000);
    assert.equal(r.calorieGoalMaxKcal, 2200);
  });

  it('carb/fat ranges are ±10% with minimum deltas', () => {
    const r = computeGoalRanges(80, 2000, 250, 70, 'maintain');
    assert.equal(r.carbohydrateGoalMinG, 225);
    assert.equal(r.carbohydrateGoalMaxG, 275);
    assert.equal(r.fatGoalMinG, 63);
    assert.equal(r.fatGoalMaxG, 77);
  });
});

describe('calculateRecommendationFull macro extension', () => {
  it('adds carbohydrate and fat goals with policy guards', () => {
    const r = calculateRecommendationFull({
      gender: 'male',
      age: 30,
      heightCm: 173,
      weightKg: 79,
      activityLevel: 'moderate',
      goal: 'lose',
    });
    assert.equal(r.calorieGoalKcal, 2376);
    assert.equal(r.proteinGoalG, 111);
    assert.ok(r.carbohydrateGoalG >= 100);
    assert.ok(r.fatGoalG >= Math.round(79 * 0.6));
    assert.equal(r.policy.carbohydrateRatio, 0.6);
    assert.equal(r.policy.fatRatio, 0.4);
  });
});
