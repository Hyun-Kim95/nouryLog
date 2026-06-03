import { isAiEnabled, LLM_MODEL, LLM_PROVIDER } from '../../lib/aiConfig.js';
import { ollamaChat } from '../llm/ollamaClient.js';
import type { LlmMeta } from './aiLlmNarrative.js';
import type { AiRagCitation } from './aiRagCitations.js';
import { ragContextChunks } from './aiRagCitations.js';
import type { VectorSearchHit } from '../vector/vectorStore.js';
import { DISCLAIMER } from './aiTemplateAnswer.js';

export function buildTemplateSemanticAnswer(question: string, citations: AiRagCitation[]): string {
  if (citations.length === 0) {
    return `질문과 관련된 식단 기록을 찾지 못했습니다. 다른 표현으로 검색하거나 앱에서 기록을 추가해 주세요. ${DISCLAIMER}`;
  }
  const lines = citations.map((c) => `- ${c.label}`);
  return `질문「${question}」과 관련해 아래 기록을 찾았습니다.\n\n${lines.join('\n')}\n\n자세한 영양 수치는 각 기록을 참고해 주세요. ${DISCLAIMER}`;
}

export function buildTemplateKnowledgeAnswer(question: string, citations: AiRagCitation[]): string {
  if (citations.length === 0) {
    return `영양 지식 문서에서 관련 내용을 찾지 못했습니다. 구체적인 기간·섭취 질문은 "이번 주 단백질 섭취 어때?"처럼 물어보실 수 있습니다. ${DISCLAIMER}`;
  }
  const lines = citations.map((c) => `- ${c.label}`);
  return `질문「${question}」에 대해 참고할 수 있는 일반 영양 정보입니다.\n\n${lines.join('\n')}\n\n개인 섭취량은 별도로 기록·집계 질문을 이용해 주세요. ${DISCLAIMER}`;
}

export async function narrateRagAnswer(params: {
  question: string;
  intent: 'semantic_meal' | 'knowledge_query';
  hits: VectorSearchHit[];
  citations: AiRagCitation[];
}): Promise<{ answer: string; llm: LlmMeta }> {
  const llmBase: LlmMeta = { provider: LLM_PROVIDER, model: LLM_MODEL, used: false };
  const template =
    params.intent === 'semantic_meal'
      ? buildTemplateSemanticAnswer(params.question, params.citations)
      : buildTemplateKnowledgeAnswer(params.question, params.citations);

  if (!isAiEnabled() || params.citations.length === 0) {
    return { answer: template, llm: llmBase };
  }

  const chunks = ragContextChunks(params.hits);
  const citeLines = params.citations.map((c) => c.label).join('\n');

  try {
    const { content } = await ollamaChat([
      {
        role: 'system',
        content:
          '당신은 영양 기록·지식 안내 도우미입니다. 제공된 검색 결과만 근거로 답하세요. ' +
          '새로운 수치를 만들지 말고, 의료 진단·처방 표현은 피하세요. 한국어로 간결히 답하세요.',
      },
      {
        role: 'user',
        content: [
          `질문: ${params.question}`,
          '',
          '검색 결과:',
          ...chunks,
          '',
          '인용 라벨:',
          citeLines,
        ].join('\n'),
      },
    ]);
    if (!content.trim()) return { answer: template, llm: llmBase };
    return {
      answer: `${content.trim()}\n\n${DISCLAIMER}`,
      llm: { ...llmBase, used: true },
    };
  } catch {
    return { answer: template, llm: llmBase };
  }
}
