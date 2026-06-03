import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('aiConfig', () => {
  it('isAiEnabled parses truthy', async () => {
    const prev = process.env.AI_ENABLED;
    process.env.AI_ENABLED = '1';
    const { isAiEnabled } = await import('./aiConfig.js');
    assert.equal(isAiEnabled(), true);
    process.env.AI_ENABLED = prev ?? '';
  });
});
