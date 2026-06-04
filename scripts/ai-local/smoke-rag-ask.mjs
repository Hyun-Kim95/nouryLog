#!/usr/bin/env node
/**
 * RAG ask smoke — requires dev server, AI stack, seed user, backfill + seed-kb.
 * Usage:
 *   npm run ai:backfill
 *   npm run ai:seed-kb
 *   API_URL=http://localhost:3000 node scripts/ai-local/smoke-rag-ask.mjs
 */
const API = process.env.API_URL ?? 'http://localhost:3000';
const EMAIL = process.env.SMOKE_EMAIL ?? 'user@example.com';
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'user123';

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`login ${res.status}`);
  const data = await res.json();
  return data.accessToken;
}

async function ask(token, question) {
  const res = await fetch(`${API}/me/ai/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ question }),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function main() {
  const token = await login();
  console.log('OK: login');

  const cases = [
    { label: 'stats_query', question: '이번 주 단백질 섭취 어때?', intent: 'stats_query' },
    { label: 'semantic_meal', question: '예전에 먹었던 닭가슴살 비슷한 식사 찾아줘', intent: 'semantic_meal' },
    { label: 'knowledge_query', question: '일반적으로 식이섬유는 왜 필요한가요?', intent: 'knowledge_query' },
    { label: 'knowledge_query_carb', question: '탄수화물은 왜 필요한가요?', intent: 'knowledge_query' },
    { label: 'unknown_off_topic', question: '안녕하세요', intent: 'unknown' },
  ];

  let failed = 0;
  for (const c of cases) {
    const { status, body } = await ask(token, c.question);
    const ok =
      status === 200 &&
      body.intent === c.intent &&
      typeof body.answer === 'string' &&
      body.answer.length > 0;
    console.log(
      ok ? 'OK' : 'FAIL',
      c.label,
      `intent=${body.intent}`,
      `citations=${body.citations?.length ?? 0}`,
      `llm.used=${body.llm?.used}`,
    );
    if (!ok) failed += 1;
  }

  if (failed > 0) {
    console.error(`FAIL: ${failed} case(s). Run ai:backfill and ai:seed-kb if semantic/knowledge empty.`);
    process.exit(1);
  }
  console.log('OK: all RAG ask cases');
}

main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
