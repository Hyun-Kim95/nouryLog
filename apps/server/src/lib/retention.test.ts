import assert from 'node:assert/strict';
import test from 'node:test';
import { inactivePurgeCutoff, INACTIVE_RETENTION_MS } from './retention.js';

test('inactivePurgeCutoff is one year before now', () => {
  const now = new Date('2026-06-20T12:00:00.000Z');
  const cutoff = inactivePurgeCutoff(now);
  assert.equal(cutoff.getTime(), now.getTime() - INACTIVE_RETENTION_MS);
});
