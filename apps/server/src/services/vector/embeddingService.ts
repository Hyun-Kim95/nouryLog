import { isAiEnabled, VECTOR_BACKEND } from '../../lib/aiConfig.js';
import { ollamaEmbed } from '../llm/ollamaClient.js';
import { EMBEDDING_DIMENSION, pgvectorPing } from './pgvectorClient.js';

export type EmbedResult =
  | { ok: true; vector: number[] }
  | { ok: false; reason: 'disabled' | 'backend' | 'unreachable' | 'dimension' | 'embed_failed' };

export async function embedText(text: string): Promise<EmbedResult> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, reason: 'embed_failed' };
  if (!isAiEnabled()) return { ok: false, reason: 'disabled' };
  if (VECTOR_BACKEND !== 'pgvector') return { ok: false, reason: 'backend' };

  const pg = await pgvectorPing();
  if (!pg.ok) return { ok: false, reason: 'unreachable' };

  try {
    const vector = await ollamaEmbed(trimmed);
    if (vector.length !== EMBEDDING_DIMENSION) {
      return { ok: false, reason: 'dimension' };
    }
    return { ok: true, vector };
  } catch {
    return { ok: false, reason: 'embed_failed' };
  }
}

/** Bracket form for logging */
export function vectorToPgLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`;
}

/** Quoted literal for Postgres `::vector` cast */
export function vectorToPgSql(vec: number[]): string {
  const inner = `[${vec.join(',')}]`.replace(/'/g, "''");
  return `'${inner}'::vector`;
}
