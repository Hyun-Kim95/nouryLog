import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeScaledNutritionFromGrams } from './mealFromTemplate.js';

describe('computeScaledNutritionFromGrams', () => {
  const egg = {
    servingGrams: 50,
    calories: 78,
    protein: 6.3,
    fat: 5.3,
    carbohydrate: 0.6,
  };

  it('2 portions (2× g) matches 2× total grams', () => {
    const a = computeScaledNutritionFromGrams(egg, 2 * egg.servingGrams);
    const b = computeScaledNutritionFromGrams(egg, 100);
    assert.deepEqual(a, b);
    assert.equal(a.grams, 100);
    assert.ok(Math.abs(a.calories - 156) < 1e-6);
  });
});
