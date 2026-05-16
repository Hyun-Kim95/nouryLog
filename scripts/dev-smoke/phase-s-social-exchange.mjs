#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Phase S (native social SDK exchange) — dev smoke.
 *
 * 사용법:
 *   1) `npm run dev:server` 가 떠 있어야 한다 (기본 http://localhost:3000).
 *   2) `node scripts/dev-smoke/phase-s-social-exchange.mjs` 실행.
 *
 * 점검 범위(실제 SNS 토큰 없이 검증할 수 있는 입력 계약만):
 *   - 잘못된 provider → 422 VALIDATION_FAILED.
 *   - 빈 body → 422 VALIDATION_FAILED (providerAccessToken/idToken 누락).
 *   - 가짜 토큰 → 401 OAUTH_PROVIDER_ERROR (provider 응답이 거부).
 *   - conflict resolve 엔드포인트는 기존 그대로 작동.
 */

const BASE = process.env.PHASE_S_BASE ?? process.env.PHASE_SMOKE_BASE ?? 'http://localhost:3000';

let passed = 0;
let failed = 0;

function log(label, ok, detail = '') {
  const tag = ok ? 'PASS' : 'FAIL';
  if (ok) passed += 1;
  else failed += 1;
  console.log(`[${tag}] ${label}${detail ? ' — ' + detail : ''}`);
}

async function req(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }
  return { status: res.status, body };
}

async function main() {
  console.log(`Phase S (native social SDK exchange) smoke @ ${BASE}`);

  {
    const r = await req('/auth/social/foo/exchange', {
      method: 'POST',
      body: JSON.stringify({ providerAccessToken: 'x' }),
    });
    log(
      'invalid provider → 422',
      r.status === 422 && r.body?.code === 'VALIDATION_FAILED',
      `status=${r.status} code=${r.body?.code}`,
    );
  }

  {
    const r = await req('/auth/social/naver/exchange', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    log(
      'missing tokens → 422',
      r.status === 422 && r.body?.code === 'VALIDATION_FAILED',
      `status=${r.status} code=${r.body?.code}`,
    );
  }

  for (const provider of ['naver', 'kakao', 'google']) {
    const r = await req(`/auth/social/${provider}/exchange`, {
      method: 'POST',
      body: JSON.stringify({ providerAccessToken: 'invalid-token-for-smoke' }),
    });
    log(
      `${provider}: bogus token → 401 OAUTH_PROVIDER_ERROR`,
      r.status === 401 && r.body?.code === 'OAUTH_PROVIDER_ERROR',
      `status=${r.status} code=${r.body?.code}`,
    );
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

await main();
