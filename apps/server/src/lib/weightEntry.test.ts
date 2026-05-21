import assert from 'node:assert/strict';
import test from 'node:test';
import { kstDayBoundsForInstant } from './weightEntry.js';

test('kstDayBoundsForInstant wraps KST midnight to next day', () => {
  const at = new Date('2026-05-19T14:30:00.000Z');
  const { ymd, start, endExclusive } = kstDayBoundsForInstant(at);
  assert.equal(ymd, '2026-05-19');
  assert.ok(start.getTime() < at.getTime());
  assert.ok(endExclusive.getTime() > at.getTime());
  assert.equal(endExclusive.getTime() - start.getTime(), 24 * 60 * 60 * 1000);
});
