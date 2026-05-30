import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ANALYTICS_APP_NAME, isAnalyticsEnabled, posthogHost } from './config';

describe('analytics config', () => {
  it('uses nourylog app name for shared project filter', () => {
    assert.equal(ANALYTICS_APP_NAME, 'nourylog');
  });

  it('defaults to disabled without env', () => {
    assert.equal(isAnalyticsEnabled(), false);
  });

  it('defaults host to US ingest', () => {
    assert.match(posthogHost, /posthog\.com$/);
  });
});
