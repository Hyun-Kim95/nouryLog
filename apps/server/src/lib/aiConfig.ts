function readEnv(name: string, fallback = ''): string {
  const raw = process.env[name] ?? fallback;
  return String(raw).trim().replace(/^['"]|['"]$/g, '');
}

export const LLM_PROVIDER = readEnv('LLM_PROVIDER', 'ollama');
export const LLM_BASE_URL = readEnv('LLM_BASE_URL', 'http://localhost:11434').replace(/\/$/, '');
export const LLM_MODEL = readEnv('LLM_MODEL', 'qwen2.5:3b');
export const EMBED_MODEL = readEnv('EMBED_MODEL', 'nomic-embed-text');
export const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 30_000);

/** 로컬·Railway 공통 — Chroma 미사용. SSOT: feature-ai-rag-prd.md §5.5 */
export const VECTOR_BACKEND = readEnv('VECTOR_BACKEND', 'pgvector');

export const AI_RATE_LIMIT_PER_MIN = Number(process.env.AI_RATE_LIMIT_PER_MIN ?? 10);

export const EMBED_TOP_K = Number(process.env.EMBED_TOP_K ?? 5);
export const EMBED_MIN_SCORE = Number(process.env.EMBED_MIN_SCORE ?? 0.35);

export function isAiEnabled(): boolean {
  const v = readEnv('AI_ENABLED').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}
