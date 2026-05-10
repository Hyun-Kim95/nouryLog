#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Phase T — dev smoke (권장량 사용자 override 입력).
 *
 * 사용법:
 *   1) `npm run dev:server` 가 떠 있어야 한다 (기본 http://localhost:3000).
 *   2) `node scripts/dev-smoke/phase-t.mjs` 실행.
 *
 * 점검 범위:
 *   - PUT /me/profile에 proteinGoalG/calorieGoalKcal 직접 입력 후 GET 응답이 그대로 반영되는지.
 *   - recalc 호출 없이 override 값이 유지되는지(override 우선 정책).
 *   - 그 후 POST /me/recommendation/recalculate가 자동값으로 덮어쓰는지(reset-to-auto 정책).
 *
 * DB 영향: 시드 USER 프로필 proteinGoalG/calorieGoalKcal을 임시로 바꾼 뒤 원상 복구한다.
 */

const BASE = process.env.PHASE_T_BASE ?? 'http://localhost:3000';
const USER = { email: 'user@example.com', password: 'user123' };

let passed = 0;
let failed = 0;
const failures = [];

function log(label, ok, detail = '') {
  if (ok) passed += 1;
  else {
    failed += 1;
    failures.push({ label, detail });
  }
  const tag = ok ? 'PASS' : 'FAIL';
  console.log(`[${tag}] ${label}${detail ? ' — ' + detail : ''}`);
}

async function req(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = { raw: text }; }
  }
  return { status: res.status, body };
}

async function login(creds) {
  const r = await req('/auth/login', { method: 'POST', body: JSON.stringify(creds) });
  if (r.status !== 200) throw new Error(`login ${creds.email} ${r.status} ${JSON.stringify(r.body)}`);
  const token = r.body.accessToken ?? r.body.token ?? r.body.access;
  if (!token) throw new Error(`no token: ${JSON.stringify(r.body)}`);
  return token;
}

async function authed(token, path, init = {}) {
  return req(path, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
}

async function main() {
  console.log(`Phase T smoke @ ${BASE}`);
  console.log('='.repeat(60));

  const token = await login(USER);
  log('user login', true);

  const beforeRes = await authed(token, '/me/profile');
  if (beforeRes.status !== 200) throw new Error(`GET profile ${beforeRes.status}`);
  const before = beforeRes.body;
  const restorePatch = {
    gender: before.gender,
    age: before.age,
    heightCm: before.heightCm,
    weightKg: before.weightKg,
    activityLevel: before.activityLevel,
    goal: before.goal,
  };

  try {
    // 1) override 저장 — 임의값 (자동 권장값과 다른 값)
    const OV = { proteinGoalG: 123, calorieGoalKcal: 1800 };
    const putOv = await authed(token, '/me/profile', { method: 'PUT', body: JSON.stringify(OV) });
    log(
      'PUT /me/profile { proteinGoalG, calorieGoalKcal } 200 (override)',
      putOv.status === 200,
      `status=${putOv.status}`,
    );

    // 2) GET이 override 값을 반영
    const get1 = await authed(token, '/me/profile');
    log(
      'GET /me/profile reflects override (no recalc called)',
      get1.status === 200
        && get1.body.proteinGoalG === OV.proteinGoalG
        && get1.body.calorieGoalKcal === OV.calorieGoalKcal,
      `protein=${get1.body.proteinGoalG} calorie=${get1.body.calorieGoalKcal}`,
    );

    // 3) reset-to-auto: recalc 호출 → 자동값으로 덮어쓰기
    const recalc = await authed(token, '/me/recommendation/recalculate', { method: 'POST' });
    log(
      'POST /me/recommendation/recalculate overrides override (reset-to-auto)',
      recalc.status === 200
        && typeof recalc.body.proteinGoalG === 'number'
        && typeof recalc.body.calorieGoalKcal === 'number'
        && (recalc.body.proteinGoalG !== OV.proteinGoalG
            || recalc.body.calorieGoalKcal !== OV.calorieGoalKcal),
      `protein=${recalc.body.proteinGoalG} calorie=${recalc.body.calorieGoalKcal}`,
    );

    // 4) 검증: 음수 단백질 → 422
    const r422 = await authed(token, '/me/profile', {
      method: 'PUT',
      body: JSON.stringify({ proteinGoalG: -1 }),
    });
    log(
      'PUT /me/profile { proteinGoalG: -1 } → 422',
      r422.status === 422,
      `status=${r422.status}`,
    );

    // 5) 검증: 비정수 → 422
    const r422b = await authed(token, '/me/profile', {
      method: 'PUT',
      body: JSON.stringify({ calorieGoalKcal: 1500.5 }),
    });
    log(
      'PUT /me/profile { calorieGoalKcal: 1500.5 } → 422',
      r422b.status === 422,
      `status=${r422b.status}`,
    );
  } finally {
    // 원상 복구 (자동 recalc 한 번 더)
    try {
      await authed(token, '/me/profile', { method: 'PUT', body: JSON.stringify(restorePatch) });
      await authed(token, '/me/recommendation/recalculate', { method: 'POST' });
      log('restore profile to original + recalc', true);
    } catch (e) {
      log('restore profile to original + recalc', false, String(e.message));
    }
  }

  console.log('='.repeat(60));
  console.log(`Phase T smoke summary: ${passed}/${passed + failed} passed (${failed} failed)`);
  if (failed > 0) {
    for (const f of failures) console.log(`  FAIL: ${f.label} — ${f.detail}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('UNCAUGHT', e);
  process.exitCode = 2;
});
