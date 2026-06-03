import { prisma } from '../../lib/prisma.js';
import { VECTOR_BACKEND } from '../../lib/aiConfig.js';

/** Ollama `nomic-embed-text` default dimension */
export const EMBEDDING_DIMENSION = 768;

export type PgvectorPingResult = {
  ok: boolean;
  extensionInstalled: boolean;
  embeddingTableReady: boolean;
  error?: string;
};

export async function pgvectorPing(): Promise<PgvectorPingResult> {
  if (VECTOR_BACKEND !== 'pgvector') {
    return {
      ok: false,
      extensionInstalled: false,
      embeddingTableReady: false,
      error: 'backend_not_pgvector',
    };
  }
  try {
    const ext = await prisma.$queryRaw<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `;
    const extensionInstalled = ext.length > 0;

    let embeddingTableReady = false;
    if (extensionInstalled) {
      const tbl = await prisma.$queryRaw<Array<{ regclass: string | null }>>`
        SELECT to_regclass('public."AiEmbedding"')::text AS regclass
      `;
      embeddingTableReady = Boolean(tbl[0]?.regclass);
    }

    const ok = extensionInstalled && embeddingTableReady;
    let error: string | undefined;
    if (!extensionInstalled) error = 'extension_missing';
    else if (!embeddingTableReady) error = 'AiEmbedding_table_missing';

    return { ok, extensionInstalled, embeddingTableReady, error: ok ? undefined : error };
  } catch (e) {
    return {
      ok: false,
      extensionInstalled: false,
      embeddingTableReady: false,
      error: e instanceof Error ? e.message : 'query_failed',
    };
  }
}
