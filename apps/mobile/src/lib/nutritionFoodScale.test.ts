import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildNutritionFoodMealBody,
  catalogReferenceServingGrams,
  clampNutritionFoodGrams,
  formatScaledMacroForForm,
  nutritionFoodListEnergyHint,
  resolveNutritionFoodDefaultGrams,
  scaleNutritionFromPer100g,
} from './nutritionFoodScale';

describe('AC-02/AC-03 nutritionFoodScale', () => {
  it('scales 165 kcal at 150g to 247.5 without rounding', () => {
    const r = scaleNutritionFromPer100g(
      { calories: 165, protein: 31, fat: 3.6, carbohydrate: 0 },
      150,
    );
    assert.equal(r.grams, 150);
    assert.equal(r.calories, 247.5);
    assert.equal(r.protein, 46.5);
    assert.equal(r.fat, 5.4);
    assert.equal(r.carbohydrate, 0);
  });

  it('defaults null serving to 100g scale=1', () => {
    const g = resolveNutritionFoodDefaultGrams(null);
    assert.equal(g, 100);
    const r = scaleNutritionFromPer100g({ calories: 100, protein: 10, fat: 1, carbohydrate: 2 }, g);
    assert.equal(r.calories, 100);
  });

  it('clamps defaultServingGrams above 5000', () => {
    assert.equal(resolveNutritionFoodDefaultGrams(9000), 5000);
    assert.equal(clampNutritionFoodGrams(0), 1);
  });

  it('formatScaledMacroForForm keeps one decimal when needed', () => {
    assert.equal(formatScaledMacroForForm(247.5), '247.5');
    assert.equal(formatScaledMacroForForm(100), '100');
  });

  it('AC-04: catalogReferenceServingGrams null when missing', () => {
    assert.equal(catalogReferenceServingGrams(null), null);
    assert.equal(catalogReferenceServingGrams(undefined), null);
    assert.equal(catalogReferenceServingGrams(0), null);
  });

  it('AC-01: catalogReferenceServingGrams keeps catalog value', () => {
    assert.equal(catalogReferenceServingGrams(210), 210);
  });
});

describe('nutritionFoodListEnergyHint', () => {
  it('shows scaled kcal and serving grams when defaultServingGrams set', () => {
    assert.equal(
      nutritionFoodListEnergyHint({
        per100g: { calories: 165, protein: 31, fat: 3.6, carbohydrate: 0 },
        defaultServingGrams: 150,
      }),
      '248 kcal · 150g',
    );
  });

  it('falls back to per 100g when defaultServingGrams missing', () => {
    assert.equal(
      nutritionFoodListEnergyHint({
        per100g: { calories: 165, protein: 31, fat: 3.6, carbohydrate: 0 },
        defaultServingGrams: null,
      }),
      '165 kcal/100g',
    );
  });
});

describe('AC-07 buildNutritionFoodMealBody', () => {
  it('includes grams and TOTAL_GRAMS (not legacy portionQuantity=1)', () => {
    const body = buildNutritionFoodMealBody({
      mealBodyBase: { mealSlot: 'LUNCH' },
      name: '닭가슴살',
      grams: 150,
      calories: 247.5,
      protein: 46.5,
      fat: 5.4,
      carbohydrate: 0,
      editing: false,
    });
    assert.equal(body.grams, 150);
    assert.equal(body.mealInputMode, 'TOTAL_GRAMS');
    assert.equal(body.portionQuantity, null);
    assert.equal(body.foodTemplateId, null);
    assert.equal(body.calories, 247.5);
  });

  it('rejects grams out of range', () => {
    assert.throws(() =>
      buildNutritionFoodMealBody({
        mealBodyBase: {},
        name: 'x',
        grams: 0,
        calories: 1,
        protein: 1,
        fat: 1,
        carbohydrate: 1,
        editing: false,
      }),
    );
  });
});
