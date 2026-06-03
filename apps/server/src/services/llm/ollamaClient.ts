import { EMBED_MODEL, LLM_BASE_URL, LLM_MODEL, LLM_TIMEOUT_MS } from '../../lib/aiConfig.js';

export type OllamaChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type OllamaChatResult = {
  content: string;
  model: string;
};

async function ollamaFetch(path: string, body: unknown): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    return await fetch(`${LLM_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function ollamaPing(): Promise<{ ok: boolean; models: string[]; error?: string }> {
  try {
    const res = await fetch(`${LLM_BASE_URL}/api/tags`, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) {
      return { ok: false, models: [], error: `http_${res.status}` };
    }
    const data = (await res.json()) as { models?: Array<{ name?: string }> };
    const models = (data.models ?? []).map((m) => m.name).filter((n): n is string => Boolean(n));
    return { ok: true, models };
  } catch (e) {
    return { ok: false, models: [], error: e instanceof Error ? e.message : 'unreachable' };
  }
}

export async function ollamaChat(
  messages: OllamaChatMessage[],
  options?: { model?: string },
): Promise<OllamaChatResult> {
  const model = options?.model ?? LLM_MODEL;
  const res = await ollamaFetch('/api/chat', {
    model,
    messages,
    stream: false,
  });
  if (!res.ok) {
    throw new Error(`ollama_chat_http_${res.status}`);
  }
  const data = (await res.json()) as {
    message?: { content?: string };
    model?: string;
  };
  const content = data.message?.content?.trim() ?? '';
  if (!content) throw new Error('ollama_chat_empty');
  return { content, model: data.model ?? model };
}

export async function ollamaEmbed(text: string, options?: { model?: string }): Promise<number[]> {
  const model = options?.model ?? EMBED_MODEL;
  const res = await ollamaFetch('/api/embeddings', { model, prompt: text });
  if (!res.ok) {
    throw new Error(`ollama_embed_http_${res.status}`);
  }
  const data = (await res.json()) as { embedding?: number[] };
  if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
    throw new Error('ollama_embed_empty');
  }
  return data.embedding;
}
