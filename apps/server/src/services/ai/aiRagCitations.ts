import { prisma } from '../../lib/prisma.js';
import type { VectorSearchHit } from '../vector/vectorStore.js';
import { formatMealCitationLabel } from './aiStatsPeriod.js';
import type { AiMealCitation } from './aiMealAggregate.js';
import { todayAnchorKst } from '../../lib/statsPeriod.js';

export type AiKnowledgeCitation = {
  type: 'knowledge_doc';
  sourceId: string;
  date: string;
  label: string;
};

export type AiOcrSnippetCitation = {
  type: 'ocr_feedback';
  sourceId: string;
  date: string;
  label: string;
};

export type AiRagCitation = AiMealCitation | AiKnowledgeCitation | AiOcrSnippetCitation;

export async function citationsFromSemanticHits(
  userId: string,
  hits: VectorSearchHit[],
): Promise<AiRagCitation[]> {
  const citations: AiRagCitation[] = [];
  const seenMeals = new Set<string>();

  for (const hit of hits) {
    if (hit.collection === 'meals' && hit.sourceId) {
      if (seenMeals.has(hit.sourceId)) continue;
      const meal = await prisma.meal.findFirst({
        where: { id: hit.sourceId, userId, active: true },
      });
      if (!meal) continue;
      seenMeals.add(meal.id);
      const date = meal.consumedAt.toISOString().slice(0, 10);
      citations.push({
        type: 'meal',
        mealId: meal.id,
        date,
        foodName: meal.name,
        mealSlot: meal.mealSlot,
        nutrients: {
          protein: meal.protein,
          calories: meal.calories,
          carbohydrate: meal.carbohydrate,
          fat: meal.fat,
        },
        label: formatMealCitationLabel(date, meal.mealSlot, meal.name, meal.protein),
      });
      continue;
    }

    if (hit.collection === 'ocr_raw') {
      const label =
        hit.content.length > 120 ? `${hit.content.slice(0, 117)}…` : hit.content;
      citations.push({
        type: 'ocr_feedback',
        sourceId: hit.sourceId ?? hit.id,
        date: todayAnchorKst(),
        label: `OCR 기록 — ${label}`,
      });
    }
  }

  return citations.slice(0, 5);
}

export function citationsFromKnowledgeHits(hits: VectorSearchHit[]): AiKnowledgeCitation[] {
  const today = todayAnchorKst();
  return hits
    .filter((h) => h.collection === 'nutrition_kb')
    .slice(0, 5)
    .map((hit) => {
      const firstLine = hit.content.split('\n')[0]?.trim() ?? '영양 지식';
      return {
        type: 'knowledge_doc' as const,
        sourceId: hit.sourceId ?? hit.id,
        date: today,
        label: firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine,
      };
    });
}

export function ragContextChunks(hits: VectorSearchHit[]): string[] {
  return hits.slice(0, 5).map((h, i) => `[${i + 1}] (${h.collection}) ${h.content.slice(0, 500)}`);
}
