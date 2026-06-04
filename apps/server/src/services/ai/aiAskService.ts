import { prisma } from '../../lib/prisma.js';
import { isAiEnabled } from '../../lib/aiConfig.js';
import { userStatsAggregationMeta } from '../../lib/userStatsAggregationMeta.js';
import { classifyAiIntent } from './aiIntent.js';
import { aggregateMealsForAiPeriod } from './aiMealAggregate.js';
import { parseAiAnchor } from './aiStatsPeriod.js';
import { narrateAskAnswer } from './aiLlmNarrative.js';
import { DISCLAIMER } from './aiTemplateAnswer.js';
import { UNKNOWN_ASK_ANSWER } from './aiRejectionCopy.js';
import { todayAnchorKst } from '../../lib/statsPeriod.js';
import { searchByText } from '../vector/vectorStore.js';
import {
  citationsFromKnowledgeHits,
  citationsFromSemanticHits,
} from './aiRagCitations.js';
import { narrateRagAnswer } from './aiRagNarrative.js';
import { filterKnowledgeHitsByQuestion } from './aiKnowledgeTopic.js';

const QUESTION_MAX = 500;

export type AiAskInput = {
  question: string;
  contextAnchor?: string | null;
};

function ragAskMeta() {
  const meta = userStatsAggregationMeta(new Date());
  return {
    computed: null,
    isStale: meta.isStale,
    staleHours: meta.staleHours,
    aggregatedAt: meta.aggregatedAt.toISOString(),
  };
}

async function handleSemanticMealAsk(userId: string, question: string) {
  const { hits } = await searchByText({
    query: question,
    collections: ['meals', 'ocr_raw'],
    userId,
  });
  const citations = await citationsFromSemanticHits(userId, hits);
  const { answer, llm } = await narrateRagAnswer({
    question,
    intent: 'semantic_meal',
    hits,
    citations,
  });

  await prisma.aiQueryLog.create({
    data: { userId, question, intent: 'semantic_meal', usedLlm: llm.used },
  });

  return {
    answer,
    intent: 'semantic_meal' as const,
    citations,
    ...ragAskMeta(),
    llm,
    disclaimer: DISCLAIMER,
  };
}

async function handleKnowledgeAsk(userId: string, question: string) {
  const { hits: rawHits } = await searchByText({
    query: question,
    collections: ['nutrition_kb'],
    userId: null,
  });
  const hits = filterKnowledgeHitsByQuestion(question, rawHits);
  const citations = citationsFromKnowledgeHits(hits);
  const { answer, llm } = await narrateRagAnswer({
    question,
    intent: 'knowledge_query',
    hits,
    citations,
  });

  await prisma.aiQueryLog.create({
    data: { userId, question, intent: 'knowledge_query', usedLlm: llm.used },
  });

  return {
    answer,
    intent: 'knowledge_query' as const,
    citations,
    ...ragAskMeta(),
    llm,
    disclaimer: DISCLAIMER,
  };
}

export async function handleAiAsk(userId: string, input: AiAskInput) {
  if (!isAiEnabled()) {
    const err = new Error('ai_disabled');
    (err as Error & { code: string }).code = 'AI_LLM_UNAVAILABLE';
    throw err;
  }

  const question = String(input.question ?? '').trim();
  if (!question) {
    const err = new Error('empty_question');
    (err as Error & { code: string; field: string }).code = 'VALIDATION_FAILED';
    (err as Error & { field: string }).field = 'question';
    throw err;
  }
  if (question.length > QUESTION_MAX) {
    const err = new Error('too_long');
    (err as Error & { code: string }).code = 'AI_QUESTION_TOO_LONG';
    throw err;
  }

  const anchorParsed = parseAiAnchor(input.contextAnchor ?? todayAnchorKst());
  if (anchorParsed.error) {
    const err = new Error('future_anchor');
    (err as Error & { code: string; field: string }).code = 'VALIDATION_FAILED';
    (err as Error & { field: string }).field = 'contextAnchor';
    throw err;
  }

  const classified = classifyAiIntent(question);

  if (classified.intent === 'semantic_meal') {
    return handleSemanticMealAsk(userId, question);
  }

  if (classified.intent === 'knowledge_query') {
    return handleKnowledgeAsk(userId, question);
  }

  if (classified.intent === 'unknown') {
    return {
      answer: UNKNOWN_ASK_ANSWER,
      intent: 'unknown' as const,
      citations: [] as [],
      ...ragAskMeta(),
      llm: { provider: 'none', model: 'none', used: false },
      disclaimer: DISCLAIMER,
    };
  }

  if (classified.intent === 'stats_query') {
    const agg = await aggregateMealsForAiPeriod(userId, classified.periodKind, anchorParsed.anchor);
    const { answer, llm } = await narrateAskAnswer(question, classified, agg);
    const meta = userStatsAggregationMeta(new Date());

    await prisma.aiQueryLog.create({
      data: {
        userId,
        question,
        intent: classified.intent,
        usedLlm: llm.used,
      },
    });

    return {
      answer,
      intent: classified.intent,
      citations: agg.citations,
      computed: agg.computed,
      isStale: meta.isStale,
      staleHours: meta.staleHours,
      aggregatedAt: meta.aggregatedAt.toISOString(),
      llm,
      disclaimer: DISCLAIMER,
    };
  }

  const err = new Error('unhandled_intent');
  (err as Error & { code: string }).code = 'AI_LLM_UNAVAILABLE';
  throw err;
}
