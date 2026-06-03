import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { diffOcrFields } from './ocrFeedbackService.js';

describe('diffOcrFields', () => {
  it('detects changed nutrition fields', () => {
    const { changedFields, hasDiff } = diffOcrFields(
      { calories: 450, protein: 12 },
      { calories: 480, protein: 15 },
    );
    assert.equal(hasDiff, true);
    assert.deepEqual(changedFields.sort(), ['calories', 'protein'].sort());
  });

  it('returns no diff when equal', () => {
    const { hasDiff } = diffOcrFields(
      { calories: 100, protein: 10, carbohydrate: 20, fat: 5 },
      { calories: 100, protein: 10, carbohydrate: 20, fat: 5 },
    );
    assert.equal(hasDiff, false);
  });
});
