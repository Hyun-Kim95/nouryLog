import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseNutritionFoodRows, validateImportArgs } from './nutritionFoodImport.js';

/** AC-01 · AC-11 — import validation (DB upsert covered in acceptance/CLI) */
describe('nutritionFoodImport validation (AC-01, AC-11)', () => {
  it('AC-11: missing sourceVersion fails validateImportArgs', () => {
    const r = validateImportArgs({ file: 'x.json', sourceVersion: '' });
    assert.equal(r.ok, false);
  });

  it('AC-11: negative calories row is skipped with INVALID_MACRO', () => {
    const { rows, skipped, duplicateInFile } = parseNutritionFoodRows(
      [
        {
          source: 'MFDS',
          externalId: 'T1',
          name: '정상',
          per100gCalories: 100,
          per100gProtein: 10,
          per100gFat: 1,
          per100gCarbohydrate: 5,
        },
        {
          source: 'MFDS',
          externalId: 'T2',
          name: '음수',
          per100gCalories: -1,
          per100gProtein: 10,
          per100gFat: 1,
          per100gCarbohydrate: 5,
        },
      ],
      'test-v1',
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.externalId, 'T1');
    assert.ok(skipped.some((s) => s.code === 'INVALID_MACRO'));
    assert.equal(duplicateInFile, 0);
  });

  it('duplicate externalId keeps last row', () => {
    const { rows, duplicateInFile } = parseNutritionFoodRows(
      [
        {
          source: 'MFDS',
          externalId: 'D1',
          name: 'first',
          per100gCalories: 1,
          per100gProtein: 1,
          per100gFat: 1,
          per100gCarbohydrate: 1,
        },
        {
          source: 'MFDS',
          externalId: 'D1',
          name: 'last',
          per100gCalories: 2,
          per100gProtein: 2,
          per100gFat: 2,
          per100gCarbohydrate: 2,
        },
      ],
      'test-v1',
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.name, 'last');
    assert.equal(duplicateInFile, 1);
  });

  it('AC-05: SERVING_WT alias maps to defaultServingGrams', () => {
    const { rows, skipped } = parseNutritionFoodRows(
      [
        {
          source: 'MFDS',
          externalId: 'S200',
          name: '된장찌개',
          per100gCalories: 45,
          per100gProtein: 3.5,
          per100gFat: 1.8,
          per100gCarbohydrate: 4.2,
          SERVING_WT: 200,
        },
      ],
      'test-v1',
    );
    assert.equal(skipped.length, 0);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.defaultServingGrams, 200);
  });

  it('AC-05: servingWt alias maps to defaultServingGrams', () => {
    const { rows } = parseNutritionFoodRows(
      [
        {
          source: 'MFDS',
          externalId: 'S150',
          name: '사과',
          per100gCalories: 52,
          per100gProtein: 0.3,
          per100gFat: 0.2,
          per100gCarbohydrate: 13.8,
          servingWt: 150,
        },
      ],
      'test-v1',
    );
    assert.equal(rows[0]!.defaultServingGrams, 150);
  });
});
