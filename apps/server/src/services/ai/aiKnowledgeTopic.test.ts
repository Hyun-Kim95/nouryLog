import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectKnowledgeTopic, filterKnowledgeHitsByQuestion } from './aiKnowledgeTopic.js';
import type { VectorSearchHit } from '../vector/vectorStore.js';

function kbHit(sourceId: string, content: string): VectorSearchHit {
  return {
    id: '1',
    sourceId,
    content,
    collection: 'nutrition_kb',
    score: 0.9,
  };
}

describe('aiKnowledgeTopic', () => {
  it('detects 지방 topic', () => {
    assert.equal(detectKnowledgeTopic('일반적으로 지방은 왜 중요한가요?'), '지방');
  });

  it('filters unrelated kb hits when topic is 지방', () => {
    const hits = [
      kbHit('protein-basics', '# 단백질이란?\n단백질은…'),
      kbHit('fat-basics', '# 지방이란?\n지방은 에너지…'),
    ];
    const filtered = filterKnowledgeHitsByQuestion('일반적으로 지방은 왜 중요한가요?', hits);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]!.sourceId, 'fat-basics');
  });

  it('returns empty when no kb matches topic', () => {
    const hits = [kbHit('protein-basics', '# 단백질이란?\n단백질은…')];
    const filtered = filterKnowledgeHitsByQuestion('일반적으로 지방은 왜 중요한가요?', hits);
    assert.equal(filtered.length, 0);
  });

  it('filters 식이섬유 to fiber-basics only (no calorie-basics false positive)', () => {
    const hits = [
      kbHit('calorie-basics', '# 칼로리\n가공·식이섬유 함량'),
      kbHit('fiber-basics', '# 식이섬유란?\n식이섬유는 소화…'),
    ];
    const filtered = filterKnowledgeHitsByQuestion('일반적으로 식이섬유는 왜 필요한가요?', hits);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]!.sourceId, 'fiber-basics');
  });

  it('filters 탄수화물 to carb-basics only', () => {
    const hits = [
      kbHit('protein-basics', '# 단백질\n탄수화물과 함께'),
      kbHit('carb-basics', '# 탄수화물이란?\n탄수화물은 에너지…'),
    ];
    const filtered = filterKnowledgeHitsByQuestion('탄수화물은 왜 필요한가요?', hits);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]!.sourceId, 'carb-basics');
  });
});
