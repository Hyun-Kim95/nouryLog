import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { FoodTemplateItem, MealRow } from '../api/meals';
import {
  findTemplateForIntakeUnit,
  gramsFromIntakeAmount,
  intakeUnitOptionsForName,
  macrosForIntakeAmount,
  mealNameMatchesQuery,
  priorMealAmountsForName,
} from './priorMealAmounts';

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
    calories: 78,
    protein: 6,
    carbohydrate: 1,
    fat: 5,
    consumedAt: '2026-07-22T12:00:00.000Z',
    ...partial,
  };
}

describe('priorMealAmountsForName', () => {
  it('matches exact name only (김 vs 김·밥)', () => {
    assert.equal(mealNameMatchesQuery('김', '김'), true);
    assert.equal(mealNameMatchesQuery('김·밥', '김'), false);
  });

  it('aggregates with sample macros for 2개', () => {
    const meals = [
      meal({
        mealId: '1',
        name: '계란',
        grams: 100,
        calories: 156,
        protein: 12.6,
        carbohydrate: 1.2,
        fat: 10.6,
        foodTemplateId: 'tpl-egg',
        mealInputMode: 'PORTION_COUNT',
        portionQuantity: 2,
      }),
      meal({
        mealId: '2',
        name: '계란',
        grams: 50,
        calories: 78,
        protein: 6.3,
        carbohydrate: 0.6,
        fat: 5.3,
        foodTemplateId: 'tpl-egg',
        mealInputMode: 'PORTION_COUNT',
        portionQuantity: 1,
      }),
    ];
    const out = priorMealAmountsForName('계란', meals, [eggTpl], 5);
    assert.equal(out[0].label, '2개');
    assert.equal(out[0].grams, 100);
    assert.equal(out[0].macros.calories, 156);
    assert.equal(out[0].unitQuantity, 2);
  });
});

describe('intakeUnitOptionsForName', () => {
  it('includes g and 개 for egg template', () => {
    const opts = intakeUnitOptionsForName('계란', [], [eggTpl]);
    assert.equal(opts[0].id, 'g');
    assert.ok(opts.some((o) => o.label === '개' && o.servingGrams === 50));
  });

  it('converts portion amount to grams and macros', () => {
    const unit = intakeUnitOptionsForName('계란', [], [eggTpl]).find((o) => o.label === '개')!;
    assert.equal(gramsFromIntakeAmount(unit, '2'), 100);
    const m = macrosForIntakeAmount(unit, '2');
    assert.ok(m);
    assert.ok(Math.abs(m.calories - 156) < 1e-9);
  });
});

describe('findTemplateForIntakeUnit', () => {
  it('resolves egg template for 개 unit', () => {
    const unit = intakeUnitOptionsForName('계란', [], [eggTpl]).find((o) => o.label === '개')!;
    const tpl = findTemplateForIntakeUnit('계란', unit, [eggTpl]);
    assert.equal(tpl?.id, 'tpl-egg');
  });
});
