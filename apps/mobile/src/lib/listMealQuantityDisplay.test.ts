import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { FoodTemplateItem, MealRow } from '../api/meals';
import {
  listMealQuantityDisplay,
  nextMealPortionQuantity,
  portionQuantityToGrams,
  gramsToPortionQuantity,
  isLegacyPortionMeal,
  buildFoodTemplateMap,
  canAdjustMealQuantityInList,
} from './listMealQuantityDisplay';
import { matchingGramPresets } from './gramPresets';

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

describe('AC-09 listMealQuantityDisplay', () => {
  const tplById = buildFoodTemplateMap([eggTpl]);

  it('shows 2개 for PORTION_COUNT egg with grams=100', () => {
    const disp = listMealQuantityDisplay(
      meal({
        mealId: 'm1',
        name: '계란',
        grams: 100,
        foodTemplateId: 'tpl-egg',
        mealInputMode: 'PORTION_COUNT',
        portionQuantity: 2,
      }),
      tplById,
    );
    assert.ok(disp);
    assert.equal(disp.stepMode, 'portion');
    assert.equal(disp.quantity, 2);
    assert.equal(disp.unitLabel, '개');
  });

  it('shows grams when not PORTION_COUNT', () => {
    const disp = listMealQuantityDisplay(
      meal({
        mealId: 'm2',
        name: '샐러드',
        grams: 150,
        foodTemplateId: null,
      }),
      tplById,
    );
    assert.ok(disp);
    assert.equal(disp.stepMode, 'grams');
    assert.equal(disp.quantity, 150);
    assert.equal(disp.unitLabel, 'g');
  });

  it('returns null instead of fake 100 when grams missing', () => {
    const disp = listMealQuantityDisplay(
      meal({
        mealId: 'm3',
        name: '미상',
        grams: null,
      }),
      tplById,
    );
    assert.equal(disp, null);
  });

  it('shows 100g for intentional manual/NF 100g (not masked as unset)', () => {
    const disp = listMealQuantityDisplay(
      meal({
        mealId: 'm4',
        name: '진라면',
        grams: 100,
        foodTemplateId: null,
        mealInputMode: 'TOTAL_GRAMS',
        portionQuantity: null,
      }),
      tplById,
    );
    assert.ok(disp);
    assert.equal(disp.stepMode, 'grams');
    assert.equal(disp.quantity, 100);
  });

  it('canAdjust matches display (blocks PORTION when tpl missing)', () => {
    const portionMeal = meal({
      mealId: 'm5',
      name: '계란',
      grams: 100,
      foodTemplateId: 'tpl-egg',
      mealInputMode: 'PORTION_COUNT',
      portionQuantity: 2,
    });
    assert.equal(canAdjustMealQuantityInList(portionMeal, tplById), true);
    const missingTpl = listMealQuantityDisplay(portionMeal, new Map());
    assert.equal(missingTpl?.stepMode, 'portion');
    assert.equal(missingTpl?.servingGrams, null);
    assert.equal(canAdjustMealQuantityInList(portionMeal, new Map()), false);
    assert.equal(
      canAdjustMealQuantityInList(
        meal({
          mealId: 'm6',
          name: '진라면',
          grams: 100,
          foodTemplateId: null,
          mealInputMode: 'TOTAL_GRAMS',
        }),
        tplById,
      ),
      true,
    );
    assert.equal(
      canAdjustMealQuantityInList(
        meal({ mealId: 'm7', name: '밥', grams: 210, foodTemplateId: null }),
        tplById,
      ),
      true,
    );
  });
});

describe('AC-10 portion step to grams', () => {
  it('steps portion ±0.1 (one decimal)', () => {
    assert.equal(nextMealPortionQuantity(1, -0.1), 0.9);
    assert.equal(nextMealPortionQuantity(0.5, -0.1), 0.4);
    assert.equal(nextMealPortionQuantity(0.3, -0.1), 0.2);
    assert.equal(nextMealPortionQuantity(2, 0.1), 2.1);
    assert.equal(nextMealPortionQuantity(0.1, -0.1), null);
  });

  it('maps 3 × 50g → 150g', () => {
    assert.equal(portionQuantityToGrams(3, 50), 150);
  });

  it('maps grams back to portion for template save', () => {
    assert.equal(gramsToPortionQuantity(150, 50), 3);
    assert.equal(gramsToPortionQuantity(100, 50), 2);
    assert.equal(isLegacyPortionMeal({
      foodTemplateId: 'tpl-egg',
      mealInputMode: 'PORTION_COUNT',
      portionQuantity: 2,
    }), true);
  });
});

describe('AC-11 gramPresets', () => {
  it('matches soju and egg', () => {
    assert.equal(matchingGramPresets('소주').some((p) => p.grams === 360), true);
    assert.equal(matchingGramPresets('계란·토스트').some((p) => p.grams === 50), true);
  });

  it('does not match 김·밥 as 김 1장', () => {
    assert.equal(matchingGramPresets('김·밥').some((p) => p.id === 'gim'), false);
    assert.equal(matchingGramPresets('김').some((p) => p.id === 'gim'), true);
  });

  it('matches ramen family', () => {
    assert.equal(matchingGramPresets('진라면').some((p) => p.id === 'ramen'), true);
    assert.equal(matchingGramPresets('짜파게티').some((p) => p.id === 'ramen'), true);
  });
});
