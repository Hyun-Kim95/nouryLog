import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_PERIOD_REPORT_PAYLOAD_VERSION,
  AI_PERIOD_REPORT_VERSION_KEY,
  attachPeriodReportPayloadVersion,
  isCurrentPeriodReportPayload,
  normalizeCacheAnchor,
  stripPeriodReportPayloadVersion,
} from './aiPeriodReportCache.js';

describe('aiPeriodReportCache', () => {
  it('normalizeCacheAnchor week uses anchor end date', () => {
    assert.equal(normalizeCacheAnchor('week', '2026-06-15'), '2026-06-15');
  });

  it('normalizeCacheAnchor month uses first of month', () => {
    assert.equal(normalizeCacheAnchor('month', '2026-06-15'), '2026-06-01');
  });

  it('rejects legacy payload without version', () => {
    assert.equal(isCurrentPeriodReportPayload({ sections: {} }), false);
  });

  it('rejects stale payload version', () => {
    assert.equal(
      isCurrentPeriodReportPayload({ [AI_PERIOD_REPORT_VERSION_KEY]: AI_PERIOD_REPORT_PAYLOAD_VERSION - 1 }),
      false,
    );
  });

  it('accepts current payload version', () => {
    assert.equal(isCurrentPeriodReportPayload(attachPeriodReportPayloadVersion({ ok: true })), true);
  });

  it('stripPeriodReportPayloadVersion removes meta key', () => {
    const stored = attachPeriodReportPayloadVersion({ summaryText: 'x' });
    const out = stripPeriodReportPayloadVersion<{ summaryText: string }>(stored);
    assert.equal(out.summaryText, 'x');
    assert.equal((out as Record<string, unknown>)[AI_PERIOD_REPORT_VERSION_KEY], undefined);
  });
});
