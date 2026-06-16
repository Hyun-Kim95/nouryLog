import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseMealClientRequestId } from './mealClientRequestId.js';

describe('parseMealClientRequestId', () => {
  it('accepts UUID v4', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    assert.equal(parseMealClientRequestId(id), id);
  });

  it('rejects empty and non-uuid strings', () => {
    assert.equal(parseMealClientRequestId(''), null);
    assert.equal(parseMealClientRequestId('not-a-uuid'), null);
    assert.equal(parseMealClientRequestId(42), null);
  });
});
