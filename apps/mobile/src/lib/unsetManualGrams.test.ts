import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isLikelyUnsetManualGrams, resolvedEditableGrams } from './unsetManualGrams';

describe('isLikelyUnsetManualGrams', () => {
  it('treats manual grams=100 as unset', () => {
    assert.equal(
      isLikelyUnsetManualGrams({
        grams: 100,
        foodTemplateId: null,
        mealInputMode: null,
        portionQuantity: 1,
      }),
      true,
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

  it('keeps PORTION_COUNT without template id', () => {
    assert.equal(
      isLikelyUnsetManualGrams({
        grams: 100,
        foodTemplateId: null,
        mealInputMode: 'PORTION_COUNT',
        portionQuantity: 2,
      }),
      false,
    );
  });

  it('keeps manual 100g when portionQuantity is not 1', () => {
    assert.equal(
      isLikelyUnsetManualGrams({
        grams: 100,
        foodTemplateId: null,
        mealInputMode: null,
        portionQuantity: 2,
      }),
      false,
    );
  });

  it('resolvedEditableGrams empty for unset', () => {
    assert.equal(
      resolvedEditableGrams({
        mealId: 'm',
        name: '진라면',
        grams: 100,
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
});
