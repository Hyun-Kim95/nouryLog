import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { FoodTemplateItem, MealRow } from '../api/meals';
import {
  findTemplateForIntakeUnit,
  gramsFromIntakeAmount,
  intakeUnitNeedsServingGrams,
  intakeUnitOptionsForName,
  macrosForIntakeAmount,
  mealNameMatchesQuery,
  priorMealAmountsForName,
  seedUnresolvedPortionFromGrams,
  withServingGrams,
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

  // AC-04: g-only name still exposes unit chips (P1.3)
  it('always includes default unit chips even without history/template', () => {
    const opts = intakeUnitOptionsForName('신규음식', [], []);
    assert.equal(opts[0].id, 'g');
    for (const label of ['개', '접시', '공기', '병', '장']) {
      const u = opts.find((o) => o.label === label);
      assert.ok(u, `missing ${label}`);
      assert.equal(u!.kind, 'portion');
      assert.equal(u!.servingGrams, null);
      assert.equal(intakeUnitNeedsServingGrams(u!), true);
    }
  });

  // AC-01: user 1단위=g converts quantity → grams (no template)
  it('converts with user serving grams overlay', () => {
    const unit = intakeUnitOptionsForName('신규음식', [], []).find((o) => o.label === '개')!;
    assert.equal(gramsFromIntakeAmount(unit, '2'), null);
    const resolved = withServingGrams(unit, 50);
    assert.equal(gramsFromIntakeAmount(resolved, '2'), 100);
  });

  // Bugfix: 120g → select 개 must become 1개 / 1단위=120g (not 120개)
  it('seeds unresolved portion from total grams as 1 unit', () => {
    const seeded = seedUnresolvedPortionFromGrams(120);
    assert.ok(seeded);
    assert.equal(seeded!.unitQuantityText, '1');
    assert.equal(seeded!.servingGramsText, '120');
    assert.equal(seeded!.totalGramsText, '120');
    const unit = intakeUnitOptionsForName('신규', [], []).find((o) => o.label === '개')!;
    assert.equal(
      gramsFromIntakeAmount(withServingGrams(unit, Number(seeded!.servingGramsText)), seeded!.unitQuantityText),
      120,
    );
  });

  it('does not duplicate 개 when template already provides it', () => {
    const opts = intakeUnitOptionsForName('계란', [], [eggTpl]);
    assert.equal(opts.filter((o) => o.label === '개').length, 1);
    assert.equal(opts.find((o) => o.label === '개')!.servingGrams, 50);
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
