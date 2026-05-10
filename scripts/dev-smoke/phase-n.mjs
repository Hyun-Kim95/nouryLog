#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Phase N — dev smoke 회귀 점검 스크립트.
 *
 * 사용법:
 *   1) `npm run dev:server` 가 떠 있어야 한다 (기본 http://localhost:3000).
 *   2) `node scripts/dev-smoke/phase-n.mjs` 실행.
 *
 * 점검 범위:
 *   - v1.1 (admin) — /admin/dashboard, /admin/foods, /admin/inquiries, /admin/notices
 *   - v1.2 (mobile profile) — POST /auth/login, GET /me/profile, PUT /me/profile (검증 통과 케이스)
 *   - v1.3 (profile extra + recalc) — PUT /me/profile (activityLevel/goal nullable),
 *       POST /me/recommendation/recalculate (Mifflin-St Jeor)
 *
 * 본 스크립트는 데이터베이스 상태를 변경할 수 있다(시드 USER 프로필 PUT). 회귀 점검 후 원상 복구 시도까지 수행한다.
 */

const BASE = process.env.PHASE_N_BASE ?? 'http://localhost:3000';
const USER = { email: 'user@example.com', password: 'user123' };
const ADMIN = { email: 'admin@example.com', password: 'admin123' };

const cases = [];
let passed = 0;
let failed = 0;

function log(label, ok, detail = '') {
  cases.push({ label, ok, detail });
  if (ok) passed += 1;
  else failed += 1;
  const tag = ok ? 'PASS' : 'FAIL';
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

async function login(creds) {
  const r = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify(creds),
  });
  if (r.status !== 200) throw new Error(`login ${creds.email} ${r.status} ${JSON.stringify(r.body)}`);
  const token = r.body.accessToken ?? r.body.token ?? r.body.access;
  if (!token) throw new Error(`no token in login response: ${JSON.stringify(r.body)}`);
  return token;
}

async function authedReq(token, path, init = {}) {
  return req(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
}

async function main() {
  console.log(`Phase N smoke @ ${BASE}`);
  console.log('='.repeat(60));

  // --- USER 인증 + v1.2/v1.3 ---
  let userToken;
  try {
    userToken = await login(USER);
    log('user login (v1.2)', true);
  } catch (e) {
    log('user login (v1.2)', false, String(e.message));
    return summary();
  }

  const r1 = await authedReq(userToken, '/me/profile');
  const hasV13Fields =
    r1.status === 200 &&
    Object.prototype.hasOwnProperty.call(r1.body, 'activityLevel') &&
    Object.prototype.hasOwnProperty.call(r1.body, 'goal');
  log('GET /me/profile 200 + v1.3 fields (activityLevel/goal)', hasV13Fields, `status=${r1.status}`);

  const initial = {
    gender: r1.body.gender,
    age: r1.body.age,
    heightCm: r1.body.heightCm,
    weightKg: r1.body.weightKg,
    activityLevel: r1.body.activityLevel,
    goal: r1.body.goal,
  };

  // v1.3 nullable clear: explicit null
  const r2 = await authedReq(userToken, '/me/profile', {
    method: 'PUT',
    body: JSON.stringify({ activityLevel: null, goal: null }),
  });
  log('PUT /me/profile { activityLevel: null, goal: null } (v1.3 nullable clear)', r2.status === 200, `status=${r2.status}`);

  const r3 = await authedReq(userToken, '/me/profile');
  const cleared = r3.status === 200 && r3.body.activityLevel === null && r3.body.goal === null;
  log('GET /me/profile after clear → both null', cleared, `activityLevel=${r3.body.activityLevel} goal=${r3.body.goal}`);

  // v1.3 enum value
  const r4 = await authedReq(userToken, '/me/profile', {
    method: 'PUT',
    body: JSON.stringify({ activityLevel: 'moderate', goal: 'maintain' }),
  });
  log('PUT /me/profile { activityLevel: moderate, goal: maintain }', r4.status === 200, `status=${r4.status}`);

  // recalc with explicit values
  const r5 = await authedReq(userToken, '/me/recommendation/recalculate', { method: 'POST' });
  const recalcOk =
    r5.status === 200 &&
    typeof r5.body.proteinGoalG === 'number' &&
    typeof r5.body.calorieGoalKcal === 'number' &&
    r5.body.proteinGoalG > 0 &&
    r5.body.calorieGoalKcal > 0;
  log('POST /me/recommendation/recalculate 200 + (protein, calorie) > 0 (v1.3 Mifflin-St Jeor)', recalcOk, JSON.stringify(r5.body));

  // v1.2 검증 422: 나이 12 → 거부
  const r6 = await authedReq(userToken, '/me/profile', {
    method: 'PUT',
    body: JSON.stringify({ age: 12 }),
  });
  const r6Ok = r6.status === 422;
  log('PUT /me/profile { age: 12 } → 422 (v1.2 valid range)', r6Ok, `status=${r6.status}`);

  // 원상 복구
  const r7 = await authedReq(userToken, '/me/profile', {
    method: 'PUT',
    body: JSON.stringify(initial),
  });
  log('PUT /me/profile (restore initial)', r7.status === 200, `status=${r7.status}`);

  // --- ADMIN 인증 + v1.1 ---
  let adminToken;
  try {
    adminToken = await login(ADMIN);
    log('admin login (v1.1)', true);
  } catch (e) {
    log('admin login (v1.1)', false, String(e.message));
    return summary();
  }

  const today = new Date().toISOString().slice(0, 10);
  const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const r8 = await authedReq(adminToken, `/admin/dashboard?range=30d`);
  const dashOk = r8.status === 200 && r8.body && (r8.body.kpis || r8.body.summary || r8.body.period);
  log('GET /admin/dashboard?range=30d 200 + KPI body', dashOk, `status=${r8.status}`);

  const r9 = await authedReq(adminToken, `/admin/foods?page=1&size=15`);
  const foodsOk = r9.status === 200 && Array.isArray(r9.body.items);
  log('GET /admin/foods 200 + items[]', foodsOk, `status=${r9.status} total=${r9.body?.total}`);

  const r10 = await authedReq(adminToken, `/admin/inquiries?page=1&size=15&from=${past}&to=${today}`);
  const inqOk = r10.status === 200 && Array.isArray(r10.body.items);
  log('GET /admin/inquiries 200 + items[]', inqOk, `status=${r10.status} total=${r10.body?.total}`);

  const r11 = await authedReq(adminToken, `/admin/notices?page=1&size=15&from=${past}&to=${today}`);
  const noticesOk = r11.status === 200 && Array.isArray(r11.body.items);
  log('GET /admin/notices 200 + items[]', noticesOk, `status=${r11.status} total=${r11.body?.total}`);

  // 권한 점검: USER로 admin 호출 → 403
  const r12 = await authedReq(userToken, `/admin/foods`);
  log('USER → /admin/foods 403/401 (권한 차단)', r12.status === 403 || r12.status === 401, `status=${r12.status}`);

  return summary();
}

function summary() {
  console.log('='.repeat(60));
  console.log(`Phase N smoke summary: ${passed}/${passed + failed} passed (${failed} failed)`);
  if (failed > 0) {
    console.log('---');
    for (const c of cases) if (!c.ok) console.log(`  FAIL: ${c.label} — ${c.detail}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('UNCAUGHT', e);
  process.exitCode = 2;
});
