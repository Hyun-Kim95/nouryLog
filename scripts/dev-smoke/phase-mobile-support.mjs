#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * 모바일 문의·공지 API 스모크 (v1.7 delta).
 * 사용: npm run dev:server 후 `node scripts/dev-smoke/phase-mobile-support.mjs`
 */

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3000';
const USER = { email: 'user@example.com', password: 'user123' };

let passed = 0;
let failed = 0;

function log(label, ok, detail = '') {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ' — ' + detail : ''}`);
}

async function req(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
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
  const r0 = await req('/public/notices?page=1&size=5');
  log('GET /public/notices', r0.status === 200 && Array.isArray(r0.body?.items), `status=${r0.status}`);

  const login = await req('/auth/login', { method: 'POST', body: JSON.stringify(USER) });
  const token = login.body?.accessToken;
  log('POST /auth/login', login.status === 200 && !!token, `status=${login.status}`);

  if (token) {
    const r1 = await req('/me/inquiries?page=1', { headers: { Authorization: `Bearer ${token}` } });
    log('GET /me/inquiries', r1.status === 200 && Array.isArray(r1.body?.items), `status=${r1.status}`);

    const subject = `[smoke] ${Date.now()}`;
    const r2 = await req('/me/inquiries', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subject, body: 'smoke test body' }),
    });
    log('POST /me/inquiries', r2.status === 201 && r2.body?.id, `status=${r2.status}`);

    const week = await req('/stats?range=week&anchor=2026-05-12', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const weekOk =
      week.status === 200 &&
      week.body?.aggregation === 'dailyAverage' &&
      week.body?.periodMeta &&
      (week.body?.daily?.[0]?.calorieStatus != null || week.body?.daily?.length === 0);
    log('GET /stats week (dailyAverage + calorieStatus)', weekOk, `status=${week.status}`);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
