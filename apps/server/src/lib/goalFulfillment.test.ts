import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeFulfillment, isGoalMet } from './goalFulfillment.js';

describe('goalFulfillment', () => {
  it('protein atLeast met when above min', () => {
    assert.equal(
      isGoalMet('protein', 120, 100, { goal: 'maintain' }, { min: 100, max: 130 }),
      true,
    );
  });

  it('calorie maintain band met in range', () => {
    assert.equal(
      isGoalMet('calorie', 2000, 2000, { goal: 'maintain' }, { min: 1800, max: 2200 }),
      true,
    );
  });

  it('returns none status without goal', () => {
    assert.equal(computeFulfillment('calorie', 100, null, { goal: 'maintain' }).status, 'none');
  });
});
