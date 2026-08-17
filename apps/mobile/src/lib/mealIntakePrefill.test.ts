import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { FoodTemplateItem, MealRow } from '../api/meals';
import { buildFoodTemplateMap } from './listMealQuantityDisplay';
import {
  mealIntakePrefill,
  mealQuantityCaption,
  resolveMealForPrefill,
} from './mealIntakePrefill';

const eggTpl: FoodTemplateItem = {
  id: 'tpl-egg',
  name: '계란',
  memo: null,
  category: '간식',
  referenceAmount: 1,
  portionUnit: 'PIECE',
  portionLabel: '개',
  servingGrams: 50,
  calories: 78,
  protein: 6.3,
  fat: 5.3,
  carbohydrate: 0.6,
};

function meal(partial: Partial<MealRow> & Pick<MealRow, 'mealId' | 'name'>): MealRow {
  return {
    calories: 156,
    protein: 12.6,
    carbohydrate: 1.2,
    fat: 10.6,
    consumedAt: '2026-07-22T12:00:00.000Z',
    ...partial,
  };
}

describe('mealIntakePrefill', () => {
  const tplById = buildFoodTemplateMap([eggTpl]);

  it('AC-prefill-01: grams-only suggestion fills amount + unit g', () => {
    const out = mealIntakePrefill(
      meal({ mealId: 'm1', name: '닭가슴살', grams: 120 }),
      tplById,
    );
    assert.equal(out.intakeUnitId, 'g');
    assert.equal(out.amountInput, '120');
    assert.equal(out.nutritionGrams, '120');
  });

  it('AC-prefill-02: PORTION 2개 fills quantity 2 and 개 unit', () => {
    const out = mealIntakePrefill(
      meal({
        mealId: 'm2',
        name: '계란',
        grams: 100,
        foodTemplateId: 'tpl-egg',
        mealInputMode: 'PORTION_COUNT',
        portionQuantity: 2,
      }),
      tplById,
    );
    assert.equal(out.intakeUnitId, 'p:개:50');
    assert.equal(out.amountInput, '2');
    assert.equal(out.nutritionGrams, '100');
  });

  it('AC-prefill-03: suggestion without grams still fills PORTION from template', () => {
    const out = mealIntakePrefill(
      meal({
        mealId: 'm3',
        name: '계란',
        foodTemplateId: 'tpl-egg',
        mealInputMode: 'PORTION_COUNT',
        portionQuantity: 2,
      }),
      tplById,
    );
    assert.equal(out.intakeUnitId, 'p:개:50');
    assert.equal(out.amountInput, '2');
    assert.equal(out.nutritionGrams, '100');
  });

  it('AC-prefill-04: no-template PORTION snapshot fills quantity and unit', () => {
    const out = mealIntakePrefill(
      meal({
        mealId: 'm-snap',
        name: '수제쿠키',
        grams: 80,
        foodTemplateId: null,
        mealInputMode: 'PORTION_COUNT',
        portionQuantity: 2,
        portionLabel: '개',
      }),
      new Map(),
    );
    assert.equal(out.intakeUnitId, 'p:개:40');
    assert.equal(out.amountInput, '2');
    assert.equal(out.nutritionGrams, '80');
  });

  it('leaves amount empty when grams missing and not PORTION', () => {
    const out = mealIntakePrefill(meal({ mealId: 'm4', name: '샐러드' }), tplById);
    assert.equal(out.intakeUnitId, 'g');
    assert.equal(out.amountInput, '');
    assert.equal(out.nutritionGrams, '');
  });
});

describe('resolveMealForPrefill', () => {
  it('keeps payload grams', () => {
    const src = meal({ mealId: 'm1', name: '샐러드', grams: 80 });
    const out = resolveMealForPrefill(src, [meal({ mealId: 'm1', name: '샐러드', grams: 200 })]);
    assert.equal(out.grams, 80);
  });

  it('hydrates grams from cache when suggestion omitted grams', () => {
    const src = meal({ mealId: 'm1', name: '샐러드' });
    const out = resolveMealForPrefill(src, [meal({ mealId: 'm1', name: '샐러드', grams: 200 })]);
    assert.equal(out.grams, 200);
  });
});

describe('mealQuantityCaption', () => {
  const tplById = buildFoodTemplateMap([eggTpl]);

  it('shows 2개 for portion meal', () => {
    assert.equal(
      mealQuantityCaption(
        meal({
          mealId: 'm2',
          name: '계란',
          grams: 100,
          foodTemplateId: 'tpl-egg',
          mealInputMode: 'PORTION_COUNT',
          portionQuantity: 2,
        }),
        tplById,
      ),
      '2개',
    );
  });
});
