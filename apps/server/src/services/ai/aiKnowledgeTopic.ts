import type { VectorSearchHit } from '../vector/vectorStore.js';

/** 질문에서 영양 KB 주제 토큰 추출 — 없으면 벡터 검색 결과만 사용 */
const TOPIC_RULES: Array<{ re: RegExp; token: string }> = [
  { re: /지방|fat|lipid/i, token: '지방' },
  { re: /단백|프로틴|protein/i, token: '단백' },
  { re: /탄수|탄수화물|carb/i, token: '탄수' },
  { re: /칼로리|열량|kcal/i, token: '칼로리' },
  { re: /식이섬유|섬유|fiber/i, token: '섬유' },
  { re: /수분|hydration/i, token: '수분' },
];

/** 주제별 허용 sourceId — 있으면 content 토큰 매칭 없이 sourceId만 사용(섬유 오탐 방지) */
const TOPIC_KB_IDS: Record<string, string[]> = {
  지방: ['fat-basics'],
  단백: ['protein-basics', 'high-protein-foods'],
  탄수: ['carb-basics'],
  칼로리: ['calorie-basics'],
  섬유: ['fiber-basics'],
  수분: ['hydration'],
};

export function detectKnowledgeTopic(question: string): string | null {
  const q = question.trim();
  for (const { re, token } of TOPIC_RULES) {
    if (re.test(q)) return token;
  }
  return null;
}

function normalizeSourceId(hit: VectorSearchHit): string {
  const raw = hit.sourceId ?? '';
  return raw.replace(/\.md$/i, '');
}

function hitMatchesTopic(hit: VectorSearchHit, token: string): boolean {
  const allowedIds = TOPIC_KB_IDS[token];
  const sourceId = normalizeSourceId(hit);
  if (allowedIds?.length) {
    return allowedIds.includes(sourceId);
  }
  const hay = `${hit.sourceId ?? ''}\n${hit.content}`;
  return hay.includes(token);
}

/** 주제가 있으면 관련 문서만 남김. 매칭 없으면 빈 배열(엉뚱한 citation 방지). */
export function filterKnowledgeHitsByQuestion(question: string, hits: VectorSearchHit[]): VectorSearchHit[] {
  const topic = detectKnowledgeTopic(question);
  if (!topic) return hits;
  const matched = hits.filter((h) => hitMatchesTopic(h, topic));
  return matched;
}
