import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { EMBED_MIN_SCORE, EMBED_TOP_K, VECTOR_BACKEND } from '../../lib/aiConfig.js';
import { vectorToPgSql, type EmbedResult, embedText } from './embeddingService.js';
import { pgvectorPing } from './pgvectorClient.js';

export type AiEmbeddingCollection = 'meals' | 'ocr_raw' | 'ocr_corrections' | 'nutrition_kb';

export type VectorSearchHit = {
  id: string;
  sourceId: string | null;
  content: string;
  collection: AiEmbeddingCollection;
  score: number;
};

export async function isVectorStoreReady(): Promise<boolean> {
  if (VECTOR_BACKEND !== 'pgvector') return false;
  const pg = await pgvectorPing();
  return pg.ok;
}

export async function upsertEmbedding(params: {
  collection: AiEmbeddingCollection;
  sourceId: string;
  content: string;
  userId: string | null;
  vector: number[];
}): Promise<boolean> {
  const pg = await pgvectorPing();
  if (!pg.ok) return false;

  const embeddingSql = vectorToPgSql(params.vector);
  const userId = params.userId;

  if (userId === null) {
    await prisma.$executeRaw`
      DELETE FROM "AiEmbedding"
      WHERE collection = ${params.collection}
        AND "sourceId" = ${params.sourceId}
        AND "userId" IS NULL
    `;
  } else {
    await prisma.$executeRaw`
      DELETE FROM "AiEmbedding"
      WHERE collection = ${params.collection}
        AND "sourceId" = ${params.sourceId}
        AND "userId" = ${userId}
    `;
  }

  const id = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "AiEmbedding" (id, "userId", collection, "sourceId", content, embedding, "createdAt")
    VALUES (
      ${id},
      ${userId},
      ${params.collection},
      ${params.sourceId},
      ${params.content},
      ${Prisma.raw(embeddingSql)},
      NOW()
    )
  `;
  return true;
}

export async function upsertEmbeddingFromText(params: {
  collection: AiEmbeddingCollection;
  sourceId: string;
  content: string;
  userId: string | null;
}): Promise<{ indexed: boolean; embed?: EmbedResult }> {
  const embedded = await embedText(params.content);
  if (!embedded.ok) return { indexed: false, embed: embedded };
  const ok = await upsertEmbedding({
    ...params,
    vector: embedded.vector,
  });
  return { indexed: ok, embed: embedded };
}

export async function deleteEmbeddingsBySource(params: {
  collection: AiEmbeddingCollection;
  sourceId: string;
  userId: string | null;
}): Promise<void> {
  const pg = await pgvectorPing();
  if (!pg.ok) return;

  const userId = params.userId;
  if (userId === null) {
    await prisma.$executeRaw`
      DELETE FROM "AiEmbedding"
      WHERE collection = ${params.collection}
        AND "sourceId" = ${params.sourceId}
        AND "userId" IS NULL
    `;
  } else {
    await prisma.$executeRaw`
      DELETE FROM "AiEmbedding"
      WHERE collection = ${params.collection}
        AND "sourceId" = ${params.sourceId}
        AND "userId" = ${userId}
    `;
  }
}

export async function searchEmbeddings(params: {
  queryVector: number[];
  collections: AiEmbeddingCollection[];
  userId: string | null;
  topK?: number;
  minScore?: number;
}): Promise<VectorSearchHit[]> {
  const pg = await pgvectorPing();
  if (!pg.ok || params.collections.length === 0) return [];

  const topK = params.topK ?? EMBED_TOP_K;
  const minScore = params.minScore ?? EMBED_MIN_SCORE;
  const queryVecSql = vectorToPgSql(params.queryVector);
  const userId = params.userId;
  const globalOnly =
    params.collections.every((c) => c === 'nutrition_kb' || c === 'ocr_corrections') && userId === null;

  const rows = globalOnly
    ? await prisma.$queryRaw<
        Array<{
          id: string;
          sourceId: string | null;
          content: string;
          collection: string;
          distance: number;
        }>
      >`
        SELECT id, "sourceId", content, collection, (embedding <=> ${Prisma.raw(queryVecSql)}) AS distance
        FROM "AiEmbedding"
        WHERE collection IN (${Prisma.join(params.collections)})
        ORDER BY distance ASC
        LIMIT ${topK}
      `
    : await prisma.$queryRaw<
        Array<{
          id: string;
          sourceId: string | null;
          content: string;
          collection: string;
          distance: number;
        }>
      >`
        SELECT id, "sourceId", content, collection, (embedding <=> ${Prisma.raw(queryVecSql)}) AS distance
        FROM "AiEmbedding"
        WHERE collection IN (${Prisma.join(params.collections)})
          AND (
            collection IN ('nutrition_kb', 'ocr_corrections')
            OR "userId" = ${userId}
          )
        ORDER BY distance ASC
        LIMIT ${topK}
      `;

  const hits: VectorSearchHit[] = [];
  for (const row of rows) {
    const score = 1 - Number(row.distance);
    if (score < minScore) continue;
    hits.push({
      id: row.id,
      sourceId: row.sourceId,
      content: row.content,
      collection: row.collection as AiEmbeddingCollection,
      score,
    });
  }
  return hits;
}

export async function searchByText(params: {
  query: string;
  collections: AiEmbeddingCollection[];
  userId: string | null;
  topK?: number;
  minScore?: number;
}): Promise<{ hits: VectorSearchHit[]; embed: EmbedResult }> {
  const embedded = await embedText(params.query);
  if (!embedded.ok) return { hits: [], embed: embedded };
  const hits = await searchEmbeddings({
    queryVector: embedded.vector,
    collections: params.collections,
    userId: params.userId,
    topK: params.topK,
    minScore: params.minScore,
  });
  return { hits, embed: embedded };
}

export async function countIndexedMeals(userId?: string): Promise<number> {
  const pg = await pgvectorPing();
  if (!pg.ok) return 0;

  if (userId) {
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "AiEmbedding"
      WHERE collection = 'meals' AND "userId" = ${userId}
    `;
    return Number(rows[0]?.count ?? 0);
  }

  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM "AiEmbedding" WHERE collection = 'meals'
  `;
  return Number(rows[0]?.count ?? 0);
}
