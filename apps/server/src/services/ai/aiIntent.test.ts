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

  it('classifies knowledge_query for meal logging how-to (coach chip)', () => {
    const r = classifyAiIntent('식단 기록을 어떻게 시작하면 좋을까?');
    assert.equal(r.intent, 'knowledge_query');
  });

  it('classifies knowledge_query for macro why questions without period', () => {
    const r = classifyAiIntent('탄수화물은 왜 필요한가요?');
    assert.equal(r.intent, 'knowledge_query');
  });

  it('classifies semantic_meal', () => {
    const r = classifyAiIntent('예전에 먹었던 닭가슴살 비슷한 식사 찾아줘');
    assert.equal(r.intent, 'semantic_meal');
  });

  it('classifies unknown for off-topic greetings', () => {
    assert.equal(classifyAiIntent('안녕').intent, 'unknown');
    assert.equal(classifyAiIntent('오늘 날씨 어때').intent, 'unknown');
    assert.equal(classifyAiIntent('비트코인 전망').intent, 'unknown');
  });

  it('classifies stats_query when only period signal is present', () => {
    const r = classifyAiIntent('이번 주 어때');
    assert.equal(r.intent, 'stats_query');
    if (r.intent === 'stats_query') {
      assert.equal(r.periodKind, 'week_single');
      assert.equal(r.focus, 'general');
    }
  });

  it('classifies stats_query for diet-related wording', () => {
    const r = classifyAiIntent('다이어트 조언');
    assert.equal(r.intent, 'stats_query');
  });

  it('classifies knowledge_query for medical keywords', () => {
    const r = classifyAiIntent('당뇨 진단 받았는데 식단 어떻게 해야 해?');
    assert.equal(r.intent, 'knowledge_query');
  });

  it('does not classify generic verbs alone as stats_query', () => {
    assert.equal(classifyAiIntent('알려줘').intent, 'unknown');
    assert.equal(classifyAiIntent('어때').intent, 'unknown');
  });

  it('classifies empty as unknown', () => {
    assert.equal(classifyAiIntent('').intent, 'unknown');
    assert.equal(classifyAiIntent('   ').intent, 'unknown');
  });
});
