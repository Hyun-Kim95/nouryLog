import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeMealEntrySuggestions,
  type FoodTemplatePublicRow,
  type MealSuggestionMealRow,
} from './mealEntrySuggestions.js';

function tpl(id: string, name: string): FoodTemplatePublicRow {
  return {
    id,
    name,
    memo: null,
    category: null,
    portionUnit: 'GRAM',
    portionLabel: null,
    referenceAmount: 100,
    servingGrams: 100,
    calories: 100,
    protein: 10,
    fat: 5,
    carbohydrate: 15,
  };
}

function meal(id: string, name: string, consumedAt: string): MealSuggestionMealRow {
  return {
    mealId: id,
    name,
    calories: 200,
    protein: 20,
    carbohydrate: 30,
    fat: 10,
    foodTemplateId: null,
    mealInputMode: null,
    portionQuantity: 1,
    consumedAt,
  };
}

describe('mergeMealEntrySuggestions', () => {
  it('puts templates before past meals', () => {
    const items = mergeMealEntrySuggestions(
      [tpl('t1', '닭가슴살')],
      [meal('m1', '샐러드', '2026-01-01T00:00:00.000Z')],
      8,
    );
    assert.equal(items.length, 2);
    assert.equal(items[0].kind, 'template');
    assert.equal(items[1].kind, 'past_meal');
  });

  it('skips past meal when name matches template', () => {
    const items = mergeMealEntrySuggestions(
      [tpl('t1', '닭가슴살')],
      [meal('m1', '닭가슴살', '2026-01-01T00:00:00.000Z')],
      8,
    );
    assert.equal(items.length, 1);
    assert.equal(items[0].kind, 'template');
  });

  it('dedupes meals by name keeping first in list (newest-first input)', () => {
    const items = mergeMealEntrySuggestions(
      [],
      [
        meal('m-new', '김치', '2026-05-01T00:00:00.000Z'),
        meal('m-old', '김치', '2026-01-01T00:00:00.000Z'),
      ],
      8,
    );
    assert.equal(items.length, 1);
    assert.equal(items[0].kind, 'past_meal');
    if (items[0].kind === 'past_meal') {
      assert.equal(items[0].meal.mealId, 'm-new');
    }
  });

  it('respects limit', () => {
    const items = mergeMealEntrySuggestions(
      [tpl('t1', 'a'), tpl('t2', 'b'), tpl('t3', 'c')],
      [],
      2,
    );
    assert.equal(items.length, 2);
  });

  it('case-insensitive name dedupe between template and meal', () => {
    const items = mergeMealEntrySuggestions(
      [tpl('t1', 'Apple')],
      [meal('m1', 'apple', '2026-01-01T00:00:00.000Z')],
      8,
    );
    assert.equal(items.length, 1);
    assert.equal(items[0].kind, 'template');
  });
});
