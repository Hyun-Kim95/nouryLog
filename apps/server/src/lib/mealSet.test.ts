import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  deriveItemClientRequestId,
  findUnavailableTemplateItems,
  isConsumedAtInFutureKst,
  resolveApplySnackPlacement,
  selectApplicableItems,
  validateMealSetName,
  MEAL_SET_NAME_MAX,
} from './mealSet.js';

describe('validateMealSetName', () => {
  it('trims and accepts 1~40 chars', () => {
    const r = validateMealSetName('  아침 기본 세트  ');
    assert.deepEqual(r, { ok: true, value: '아침 기본 세트' });
  });

  it('rejects empty/whitespace', () => {
    assert.equal(validateMealSetName('').ok, false);
    assert.equal(validateMealSetName('   ').ok, false);
    assert.equal(validateMealSetName(42).ok, false);
  });

  it('rejects over max length', () => {
    assert.equal(validateMealSetName('가'.repeat(MEAL_SET_NAME_MAX + 1)).ok, false);
    assert.equal(validateMealSetName('가'.repeat(MEAL_SET_NAME_MAX)).ok, true);
  });
});

describe('isConsumedAtInFutureKst (AC-17)', () => {
  const now = new Date('2026-06-29T03:00:00.000Z'); // KST 12:00 2026-06-29
  it('allows past and today', () => {
    assert.equal(isConsumedAtInFutureKst(new Date('2026-06-28T10:00:00Z'), now), false);
    assert.equal(isConsumedAtInFutureKst(new Date('2026-06-29T14:30:00Z'), now), false); // KST 6/29 23:30
  });
  it('blocks tomorrow (KST)', () => {
    assert.equal(isConsumedAtInFutureKst(new Date('2026-06-29T15:30:00Z'), now), true); // KST 6/30 00:30
  });
});

describe('resolveApplySnackPlacement (AC-13)', () => {
  it('nulls placement for non-snack slot even if set default exists', () => {
    const r = resolveApplySnackPlacement('LUNCH', 'AFTER_DINNER', undefined);
    assert.deepEqual(r, { ok: true, value: null });
  });
  it('uses override over set default for snack', () => {
    const r = resolveApplySnackPlacement('SNACK', 'AFTER_DINNER', 'BEFORE_BREAKFAST');
    assert.deepEqual(r, { ok: true, value: 'BEFORE_BREAKFAST' });
  });
  it('falls back to set default for snack', () => {
    const r = resolveApplySnackPlacement('SNACK', 'AFTER_DINNER', undefined);
    assert.deepEqual(r, { ok: true, value: 'AFTER_DINNER' });
  });
  it('fails when snack has no placement', () => {
    assert.equal(resolveApplySnackPlacement('SNACK', null, undefined).ok, false);
  });
});

describe('deriveItemClientRequestId (AC-07/AC-14)', () => {
  it('derives stable per-item key from batch key', () => {
    assert.equal(deriveItemClientRequestId('batch-1', 'item-9'), 'batch-1:item-9');
  });
});

describe('selectApplicableItems (AC-05/D3)', () => {
  it('splits applicable and skipped', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const r = selectApplicableItems(items, ['b']);
    assert.deepEqual(r.applicable.map((i) => i.id), ['a', 'c']);
    assert.deepEqual(r.skippedItemIds, ['b']);
  });
  it('no exclusion keeps all', () => {
    const r = selectApplicableItems([{ id: 'a' }]);
    assert.equal(r.applicable.length, 1);
    assert.equal(r.skippedItemIds.length, 0);
  });
});

describe('findUnavailableTemplateItems (AC-05/AC-15)', () => {
  it('flags missing/inactive/incomplete', () => {
    const r = findUnavailableTemplateItems([
      { itemId: '1', foodTemplateId: null, templateActive: false, nutritionComplete: false },
      { itemId: '2', foodTemplateId: 't2', templateActive: false, nutritionComplete: true },
      { itemId: '3', foodTemplateId: 't3', templateActive: true, nutritionComplete: false },
      { itemId: '4', foodTemplateId: 't4', templateActive: true, nutritionComplete: true },
    ]);
    assert.deepEqual(r, [
      { itemId: '1', reason: 'TEMPLATE_MISSING' },
      { itemId: '2', reason: 'TEMPLATE_INACTIVE' },
      { itemId: '3', reason: 'NUTRITION_INCOMPLETE' },
    ]);
  });
});
