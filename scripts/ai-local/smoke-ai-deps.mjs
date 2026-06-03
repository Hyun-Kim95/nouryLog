#!/usr/bin/env node
/**
 * AI Tier A deps smoke — API /health/ai (Ollama + Postgres pgvector).
 * Usage: npm run dev:server (AI_ENABLED=1) 후 npm run ai:smoke
 */
const API = process.env.API_URL ?? 'http://localhost:3000';

async function main() {
  const healthRes = await fetch(`${API}/health`);
  if (!healthRes.ok) {
    console.error('FAIL: API /health', healthRes.status);
    process.exit(1);
  }
  console.log('OK: /health');

  const aiRes = await fetch(`${API}/health/ai`);
  const body = await aiRes.json();
  console.log(JSON.stringify(body, null, 2));

  if (!body.enabled) {
    console.warn('WARN: AI_ENABLED is off — set apps/server/.env AI_ENABLED=1');
    process.exit(0);
  }
  if (!body.ready) {
    console.error('FAIL: AI not ready — npm run ai:up && npm run db:migrate && npm run ai:pull-models');
    process.exit(1);
  }
  console.log('OK: AI stack ready');
}

main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
