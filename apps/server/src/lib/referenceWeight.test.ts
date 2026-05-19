import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  bmiFromKgHeight,
  computeReferenceWeight,
  suggestGoalFromWeight,
  weightRangeFromHeightCm,
} from './referenceWeight.js';

describe('referenceWeight', () => {
  it('weight range from height 170cm', () => {
    const { weightKgMin, weightKgMax } = weightRangeFromHeightCm(170);
    assert.equal(weightKgMin, 53.5);
    assert.equal(weightKgMax, 66.5);
  });

  it('suggest lose when above range', () => {
    assert.equal(suggestGoalFromWeight(78, 53.5, 66.5), 'lose');
  });

  it('suggest maintain in range', () => {
    assert.equal(suggestGoalFromWeight(60, 53.5, 66.5), 'maintain');
  });

  it('suggest gain when below range', () => {
    assert.equal(suggestGoalFromWeight(50, 53.5, 66.5), 'gain');
  });

  it('teen warning', () => {
    const r = computeReferenceWeight({ heightCm: 170, age: 16, weightKg: 70 });
    assert.ok(r.warnings.includes('teen_caution'));
    assert.equal(r.suggestedGoal, 'lose');
  });

  it('bmi calculation', () => {
    assert.equal(bmiFromKgHeight(70, 170), 24.2);
  });
});
