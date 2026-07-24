import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isLikelyUnsetManualGrams, resolvedEditableGrams } from './unsetManualGrams';

describe('isLikelyUnsetManualGrams', () => {
  it('treats missing grams as unset', () => {
    assert.equal(
      isLikelyUnsetManualGrams({
        grams: null,
        foodTemplateId: null,
        mealInputMode: null,
        portionQuantity: 1,
      }),
      true,
    );
  });

  it('keeps intentional 100g (NF defaultServingGrams / manual)', () => {
    assert.equal(
      isLikelyUnsetManualGrams({
        grams: 100,
        foodTemplateId: null,
        mealInputMode: 'TOTAL_GRAMS',
        portionQuantity: null,
      }),
      false,
    );
    assert.equal(
      isLikelyUnsetManualGrams({
        grams: 100,
        foodTemplateId: null,
        mealInputMode: null,
        portionQuantity: 1,
      }),
      false,
    );
  });

  it('keeps template portion 100g (2 eggs)', () => {
    assert.equal(
      isLikelyUnsetManualGrams({
        grams: 100,
        foodTemplateId: 'tpl-egg',
        mealInputMode: 'PORTION_COUNT',
        portionQuantity: 2,
      }),
      false,
    );
  });

  it('keeps manual non-100 grams', () => {
    assert.equal(
      isLikelyUnsetManualGrams({
        grams: 120,
        foodTemplateId: null,
        mealInputMode: null,
        portionQuantity: null,
      }),
      false,
    );
  });

  it('resolvedEditableGrams empty when grams missing', () => {
    assert.equal(
      resolvedEditableGrams({
        mealId: 'm',
        name: '진라면',
        grams: null,
        calories: 500,
        protein: 10,
        carbohydrate: 80,
        fat: 20,
        consumedAt: '2026-07-22T00:00:00.000Z',
        foodTemplateId: null,
      }),
      null,
    );
  });

  it('resolvedEditableGrams returns 100 for intentional NF row', () => {
    assert.equal(
      resolvedEditableGrams({
        mealId: 'm',
        name: '닭가슴살',
        grams: 100,
        calories: 165,
        protein: 31,
        carbohydrate: 0,
        fat: 3.6,
        consumedAt: '2026-07-22T00:00:00.000Z',
        foodTemplateId: null,
        mealInputMode: 'TOTAL_GRAMS',
        portionQuantity: null,
      }),
      100,
    );
  });
});
