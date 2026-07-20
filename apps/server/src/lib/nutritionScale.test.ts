import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scaleNutritionFromPer100g } from './nutritionFoodScale.js';

/** AC-03 · AC-12 — PRD feature-nutrition-food-db-prd.md */
describe('nutritionFoodScale (AC-03, AC-12)', () => {
  const per100g = { calories: 165, protein: 31, fat: 3.6, carbohydrate: 0 };

  it('AC-03: 150g scales calories to 247.5 without rounding', () => {
    const out = scaleNutritionFromPer100g(per100g, 150);
    assert.equal(out.calories, 247.5);
    assert.equal(out.protein, 46.5);
    assert.equal(out.fat, 5.4);
    assert.equal(out.carbohydrate, 0);
    assert.equal(out.grams, 150);
  });

  it('AC-12: grams <= 0 throws INVALID_GRAMS', () => {
    assert.throws(() => scaleNutritionFromPer100g(per100g, 0), /INVALID_GRAMS/);
    assert.throws(() => scaleNutritionFromPer100g(per100g, -1), /INVALID_GRAMS/);
  });

  it('AC-12: non-finite grams throws INVALID_GRAMS', () => {
    assert.throws(() => scaleNutritionFromPer100g(per100g, Number.NaN), /INVALID_GRAMS/);
    assert.throws(() => scaleNutritionFromPer100g(per100g, Number.POSITIVE_INFINITY), /INVALID_GRAMS/);
  });
});
