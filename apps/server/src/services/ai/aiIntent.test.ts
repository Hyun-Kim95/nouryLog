import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyAiIntent } from './aiIntent.js';

describe('classifyAiIntent', () => {
  it('classifies stats_query for weekly protein', () => {
    const r = classifyAiIntent('이번 주 단백질 섭취 어때?');
    assert.equal(r.intent, 'stats_query');
    if (r.intent === 'stats_query') {
      assert.equal(r.focus, 'protein');
      assert.equal(r.periodKind, 'week_single');
    }
  });

  it('classifies knowledge_query', () => {
    const r = classifyAiIntent('일반적으로 식이섬유는 왜 필요한가요?');
    assert.equal(r.intent, 'knowledge_query');
  });

  it('classifies semantic_meal', () => {
    const r = classifyAiIntent('예전에 먹었던 닭가슴살 비슷한 식사 찾아줘');
    assert.equal(r.intent, 'semantic_meal');
  });
});
