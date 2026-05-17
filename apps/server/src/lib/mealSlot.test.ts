import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mealSlotPatchFromBody, parseMealSlot } from './mealSlot.js';

describe('parseMealSlot', () => {
  it('accepts valid slots', () => {
    assert.equal(parseMealSlot('LUNCH'), 'LUNCH');
    assert.equal(parseMealSlot('snack'), 'SNACK');
  });

  it('returns undefined when omitted', () => {
    assert.equal(parseMealSlot(undefined), undefined);
    assert.equal(parseMealSlot(''), undefined);
  });

  it('returns null for invalid', () => {
    assert.equal(parseMealSlot('BREAKFAST '), null);
  });
});

describe('mealSlotPatchFromBody', () => {
  it('omits key when mealSlot not in body', () => {
    const r = mealSlotPatchFromBody({});
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.data, {});
  });

  it('allows explicit null', () => {
    const r = mealSlotPatchFromBody({ mealSlot: null });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.data.mealSlot, null);
  });

  it('patches DINNER', () => {
    const r = mealSlotPatchFromBody({ mealSlot: 'DINNER' });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.data.mealSlot, 'DINNER');
  });

  it('rejects invalid slot', () => {
    const r = mealSlotPatchFromBody({ mealSlot: 'MIDNIGHT' });
    assert.equal(r.ok, false);
  });
});
