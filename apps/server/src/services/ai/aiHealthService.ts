import { isAiEnabled, LLM_MODEL, EMBED_MODEL, LLM_PROVIDER, VECTOR_BACKEND } from '../../lib/aiConfig.js';
import { ollamaPing } from '../llm/ollamaClient.js';
import { pgvectorPing } from '../vector/pgvectorClient.js';
import { countIndexedMeals } from '../vector/vectorStore.js';

export type AiHealthReport = {
  enabled: boolean;
  llm: {
    provider: string;
    chatModel: string;
    embedModel: string;
    reachable: boolean;
    modelsInstalled: string[];
    chatModelReady: boolean;
    embedModelReady: boolean;
    error?: string;
  };
  vector: {
    backend: string;
    reachable: boolean;
    extensionInstalled?: boolean;
    embeddingTableReady?: boolean;
    indexedMealCount?: number;
    error?: string;
  };
  ready: boolean;
};

export async function getAiHealthReport(): Promise<AiHealthReport> {
  const enabled = isAiEnabled();
  const llmPing = await ollamaPing();
  const pg = await pgvectorPing();

  const chatModelReady = llmPing.models.some(
    (m) => m === LLM_MODEL || m.startsWith(`${LLM_MODEL}:`),
  );
  const embedModelReady = llmPing.models.some(
    (m) => m === EMBED_MODEL || m.startsWith(`${EMBED_MODEL}:`),
  );

  const indexedMealCount =
    process.env.NODE_ENV === 'development' && pg.ok ? await countIndexedMeals() : undefined;

  return {
    enabled,
    llm: {
      provider: LLM_PROVIDER,
      chatModel: LLM_MODEL,
      embedModel: EMBED_MODEL,
      reachable: llmPing.ok,
      modelsInstalled: llmPing.models,
      chatModelReady,
      embedModelReady,
      error: llmPing.error,
    },
    vector: {
      backend: VECTOR_BACKEND,
      reachable: pg.ok,
      extensionInstalled: pg.extensionInstalled,
      embeddingTableReady: pg.embeddingTableReady,
      indexedMealCount,
      error: pg.error,
    },
    ready: enabled && llmPing.ok && chatModelReady && pg.ok,
  };
}
