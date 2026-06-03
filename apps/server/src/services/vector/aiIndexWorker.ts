import type { Meal } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { buildMealIndexContent } from './mealIndexText.js';
import { deleteEmbeddingsBySource, upsertEmbeddingFromText } from './vectorStore.js';

function logIndexFailure(context: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`[ai-index] ${context}: ${msg}`);
}

export function scheduleIndexMeal(meal: Meal): void {
  setImmediate(() => {
    void indexMeal(meal).catch((e) => logIndexFailure(`meal ${meal.id}`, e));
  });
}

export async function indexMeal(meal: Meal): Promise<{ indexed: boolean }> {
  if (!meal.active) {
    await deleteEmbeddingsBySource({
      collection: 'meals',
      sourceId: meal.id,
      userId: meal.userId,
    });
    return { indexed: false };
  }

  const content = buildMealIndexContent(meal);
  const result = await upsertEmbeddingFromText({
    collection: 'meals',
    sourceId: meal.id,
    content,
    userId: meal.userId,
  });
  return { indexed: result.indexed };
}

export async function indexOcrRawText(params: {
  userId: string;
  sourceId: string;
  rawText: string;
}): Promise<{ indexed: boolean }> {
  const text = params.rawText.trim();
  if (!text) return { indexed: false };

  const result = await upsertEmbeddingFromText({
    collection: 'ocr_raw',
    sourceId: params.sourceId,
    content: text.slice(0, 2000),
    userId: params.userId,
  });
  return { indexed: result.indexed };
}

export async function indexOcrCorrectionPattern(patternSummary: string): Promise<{ indexed: boolean }> {
  const sourceId = `pattern:${Buffer.from(patternSummary).toString('base64url').slice(0, 32)}`;
  const result = await upsertEmbeddingFromText({
    collection: 'ocr_corrections',
    sourceId,
    content: patternSummary,
    userId: null,
  });
  return { indexed: result.indexed };
}

export async function indexKnowledgeDocument(params: {
  sourceId: string;
  title: string;
  body: string;
}): Promise<{ indexed: boolean }> {
  const content = `${params.title}\n\n${params.body}`.trim();
  const result = await upsertEmbeddingFromText({
    collection: 'nutrition_kb',
    sourceId: params.sourceId,
    content,
    userId: null,
  });
  return { indexed: result.indexed };
}

export function scheduleDeleteMealIndex(mealId: string, userId: string): void {
  setImmediate(() => {
    void deleteEmbeddingsBySource({ collection: 'meals', sourceId: mealId, userId }).catch((e) =>
      logIndexFailure(`delete meal ${mealId}`, e),
    );
  });
}

export function scheduleReindexMealById(mealId: string, userId: string): void {
  setImmediate(() => {
    void prisma.meal
      .findFirst({ where: { id: mealId, userId } })
      .then((meal) => {
        if (meal) return indexMeal(meal);
      })
      .catch((e) => logIndexFailure(`reindex meal ${mealId}`, e));
  });
}
