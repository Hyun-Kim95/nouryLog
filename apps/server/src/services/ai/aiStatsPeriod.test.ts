import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calendarDaysInPeriod,
  periodEndGoalDateYmd,
  resolveAiPeriodBounds,
} from './aiStatsPeriod.js';

describe('resolveAiPeriodBounds week_single', () => {
  it('anchor maps to rolling 7-day window ending at anchor', () => {
    const p = resolveAiPeriodBounds('week_single', '2026-06-03');
    assert.equal(p.kind, 'week_single');
    assert.equal(p.anchor, '2026-06-03');
    assert.equal(p.from.toISOString(), '2026-05-27T15:00:00.000Z');
    assert.equal(p.toExclusive.toISOString(), '2026-06-03T15:00:00.000Z');
    assert.equal(p.label, '5월 28일 – 6월 3일');
    const spanMs = p.toExclusive.getTime() - p.from.getTime();
    assert.equal(spanMs, 7 * 86_400_000);
  });

  it('periodEndGoalDate is anchor (window end)', () => {
    assert.equal(periodEndGoalDateYmd('week_single', '2026-06-03'), '2026-06-03');
  });

  it('calendarDays is 7 for week', () => {
    assert.equal(calendarDaysInPeriod('week_single', '2026-06-03'), 7);
  });
});
