import assert from 'node:assert/strict';
import test from 'node:test';
import { inactivePurgeCutoff } from './retention.js';

test('purge eligibility: deactivatedAt on or before cutoff', () => {
  const now = new Date('2027-06-21T00:00:00.000Z');
  const cutoff = inactivePurgeCutoff(now);
  const eligible = new Date('2026-06-20T23:59:59.999Z');
  const notYet = new Date('2026-06-21T00:00:01.000Z');
  assert.ok(eligible <= cutoff);
  assert.ok(notYet > cutoff);
});
