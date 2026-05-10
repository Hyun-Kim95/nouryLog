#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Phase P/B4 — dev smoke (권장 계산 v1.4 분기 점검).
 *
 * 사용법:
 *   1) `npm run dev:server` 가 떠 있어야 한다 (기본 http://localhost:3000).
 *   2) `node scripts/dev-smoke/phase-p.mjs` 실행.
 *
 * 점검 범위:
 *   - 응답 메타: GET /me/profile + POST /me/recommendation/recalculate 모두 `recommendationVersion`/`policy`/`warnings` 포함.
 *   - 청소년(`age=15`): policy.calorieMode === 'maintain_with_caution', warnings에 'teen_caution'.
 *   - 성인(`age=30`, goal=lose): policy.calorieMode === 'deficit', calorieDeltaKcal === -300.
 *   - 고령(`age=70`, goal=lose): policy.ageBand === 'older', calorieDeltaKcal abs ∈ [150,300], warnings에 'older_adult_caution'.
 *   - floor: 저체중·낮은 활동량 조합으로 기본 칼로리가 floor를 깨도록 만들고 'low_calorie_floor_applied' 발동.
 *
 * DB 영향: 시드 USER 프로필을 임시로 바꾼 뒤 원상 복구한다.
 */

const BASE = process.env.PHASE_P_BASE ?? 'http://localhost:3000';
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

async function setProfile(token, patch) {
  const r = await authed(token, '/me/profile', { method: 'PUT', body: JSON.stringify(patch) });
  if (r.status !== 200) throw new Error(`PUT profile ${r.status} ${JSON.stringify(r.body)}`);
}

async function recalc(token) {
  const r = await authed(token, '/me/recommendation/recalculate', { method: 'POST' });
  if (r.status !== 200) throw new Error(`recalc ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}

async function getProfile(token) {
  const r = await authed(token, '/me/profile');
  if (r.status !== 200) throw new Error(`GET profile ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}

async function main() {
  console.log(`Phase P smoke @ ${BASE}`);
  console.log('='.repeat(60));

  const token = await login(USER);
  log('user login', true);

  const original = await getProfile(token);
  log('GET /me/profile 200', true);
  log(
    'GET /me/profile carries v1.4 meta (recommendationVersion/policy/warnings)',
    original.recommendationVersion === '1.4'
      && original.policy && typeof original.policy.calorieMode === 'string'
      && Array.isArray(original.warnings),
    `version=${original.recommendationVersion} policy.ageBand=${original.policy?.ageBand}`,
  );

  const restorePatch = {
    gender: original.gender,
    age: original.age,
    heightCm: original.heightCm,
    weightKg: original.weightKg,
    activityLevel: original.activityLevel,
    goal: original.goal,
  };

  try {
    // 1) 청소년 (age=15) + lose → maintain_with_caution + teen_caution
    await setProfile(token, {
      gender: 'male', age: 15, heightCm: 170, weightKg: 60,
      activityLevel: 'moderate', goal: 'lose',
    });
    const teen = await recalc(token);
    log(
      'teen (age=15, goal=lose) → maintain_with_caution + teen_caution',
      teen.recommendationVersion === '1.4'
        && teen.policy.ageBand === 'teen'
        && teen.policy.calorieMode === 'maintain_with_caution'
        && teen.policy.calorieDeltaKcal === 0
        && teen.warnings.includes('teen_caution'),
      `mode=${teen.policy.calorieMode} delta=${teen.policy.calorieDeltaKcal} warnings=${JSON.stringify(teen.warnings)}`,
    );

    // GET 응답에도 메타 동일 — 별도 recalc 호출 없이 prefill 시 이용 가능
    const teenGet = await getProfile(token);
    log(
      'GET /me/profile after teen recalc → meta matches recalc',
      teenGet.recommendationVersion === '1.4'
        && teenGet.policy.calorieMode === 'maintain_with_caution'
        && teenGet.warnings.includes('teen_caution'),
      `policy.ageBand=${teenGet.policy.ageBand} warnings=${JSON.stringify(teenGet.warnings)}`,
    );

    // 2) 성인 (age=30) + lose → deficit (-300)
    await setProfile(token, {
      gender: 'male', age: 30, heightCm: 175, weightKg: 75,
      activityLevel: 'moderate', goal: 'lose',
    });
    const adult = await recalc(token);
    log(
      'adult (age=30, goal=lose) → deficit / delta=-300',
      adult.policy.ageBand === 'adult'
        && adult.policy.calorieMode === 'deficit'
        && adult.policy.calorieDeltaKcal === -300
        && !adult.warnings.includes('teen_caution')
        && !adult.warnings.includes('older_adult_caution'),
      `mode=${adult.policy.calorieMode} delta=${adult.policy.calorieDeltaKcal} warnings=${JSON.stringify(adult.warnings)}`,
    );

    // 3) 고령 (age=70) + lose → ageBand=older + delta in [-300,-150] + older_adult_caution + protein ≥ 1.1*weight
    await setProfile(token, {
      gender: 'male', age: 70, heightCm: 170, weightKg: 70,
      activityLevel: 'light', goal: 'lose',
    });
    const older = await recalc(token);
    const deltaAbs = Math.abs(older.policy.calorieDeltaKcal);
    log(
      'older (age=70, goal=lose) → older_adult_caution + delta clamp + protein bump',
      older.policy.ageBand === 'older'
        && deltaAbs >= 150 && deltaAbs <= 300
        && older.policy.calorieDeltaKcal < 0
        && older.warnings.includes('older_adult_caution')
        && older.policy.proteinPerKg >= 1.1
        && older.proteinGoalG >= Math.round(70 * 1.1),
      `delta=${older.policy.calorieDeltaKcal} proteinPerKg=${older.policy.proteinPerKg} protein=${older.proteinGoalG} warnings=${JSON.stringify(older.warnings)}`,
    );

    // 4) floor — 저체중 + sedentary + lose 조합으로 floor 위반 만들기
    await setProfile(token, {
      gender: 'female', age: 30, heightCm: 150, weightKg: 40,
      activityLevel: 'sedentary', goal: 'lose',
    });
    const floor = await recalc(token);
    log(
      'low BMR + lose → low_calorie_floor_applied + calorieGoalKcal >= 1200',
      floor.warnings.includes('low_calorie_floor_applied')
        && floor.calorieGoalKcal >= 1200,
      `calorie=${floor.calorieGoalKcal} warnings=${JSON.stringify(floor.warnings)}`,
    );
  } finally {
    // 원상 복구
    try {
      await setProfile(token, restorePatch);
      log('restore profile to original', true);
    } catch (e) {
      log('restore profile to original', false, String(e.message));
    }
  }

  console.log('='.repeat(60));
  console.log(`Phase P smoke summary: ${passed}/${passed + failed} passed (${failed} failed)`);
  if (failed > 0) {
    for (const f of failures) console.log(`  FAIL: ${f.label} — ${f.detail}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('UNCAUGHT', e);
  process.exitCode = 2;
});
