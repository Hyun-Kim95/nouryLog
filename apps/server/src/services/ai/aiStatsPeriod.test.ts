import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calendarDaysInPeriod,
  periodEndGoalDateYmd,
  resolveAiPeriodBounds,
} from './aiStatsPeriod.js';

describe('resolveAiPeriodBounds week_single', () => {
  it('anchor Wednesday maps to 7-day window', () => {
    const p = resolveAiPeriodBounds('week_single', '2026-06-03');
    assert.equal(p.kind, 'week_single');
    const spanMs = p.toExclusive.getTime() - p.from.getTime();
    assert.equal(spanMs, 7 * 86_400_000);
    assert.match(p.label, /\d+월 \d+일/);
  });

  it('periodEndGoalDate is Saturday of that week', () => {
    assert.equal(periodEndGoalDateYmd('week_single', '2026-06-03'), '2026-06-06');
  });

  it('calendarDays is 7 for week', () => {
    assert.equal(calendarDaysInPeriod('week_single', '2026-06-03'), 7);
  });
});
