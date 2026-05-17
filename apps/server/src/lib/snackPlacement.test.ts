import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseSnackPlacement, validateMealSlotSnackCombo } from './snackPlacement.js';

describe('parseSnackPlacement', () => {
  it('parses valid values', () => {
    assert.equal(parseSnackPlacement('BEFORE_BREAKFAST'), 'BEFORE_BREAKFAST');
    assert.equal(parseSnackPlacement('between_breakfast_lunch'), 'BETWEEN_BREAKFAST_LUNCH');
  });

  it('rejects invalid', () => {
    assert.equal(parseSnackPlacement('NOON'), null);
  });
});

describe('validateMealSlotSnackCombo', () => {
  it('requires placement for snack', () => {
    const r = validateMealSlotSnackCombo('SNACK', null);
    assert.equal(r.ok, false);
  });

  it('clears placement for non-snack', () => {
    const r = validateMealSlotSnackCombo('LUNCH', 'BEFORE_BREAKFAST');
    assert.equal(r.ok, false);
  });

  it('accepts snack with placement', () => {
    const r = validateMealSlotSnackCombo('SNACK', 'AFTER_DINNER');
    assert.equal(r.ok, true);
  });
});
