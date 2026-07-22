import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MEAL_GRAMS_STEP,
  nextMealGrams,
  scaleMacrosForGramsChange,
} from './adjustMealGramsCore';

describe('AC-07 adjustMealGrams', () => {
  it('steps ±10 and clamps', () => {
    assert.equal(nextMealGrams(150, MEAL_GRAMS_STEP), 160);
    assert.equal(nextMealGrams(150, -MEAL_GRAMS_STEP), 140);
    assert.equal(nextMealGrams(1, -MEAL_GRAMS_STEP), null);
    assert.equal(nextMealGrams(5000, MEAL_GRAMS_STEP), null);
  });

  it('rescales macros by grams ratio', () => {
    const r = scaleMacrosForGramsChange(
      { calories: 247.5, protein: 46.5, carbohydrate: 0, fat: 5.4 },
      150,
      160,
    );
    assert.ok(Math.abs(r.calories - 247.5 * (160 / 150)) < 1e-9);
  });
});
