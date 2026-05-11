#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Phase R (mobile policy consent) — dev smoke.
 *
 * 사용법:
 *   1) `npm run dev:server` 가 떠 있어야 한다 (기본 http://localhost:3000).
 *   2) `node scripts/dev-smoke/phase-r-consent.mjs` 실행.
 *
 * 점검 범위:
 *   - 공개 정책 terms/privacy 가 200 + version 을 반환한다.
 *   - /auth/signup 은 동의 누락, 만 14세 이상 확인 누락을 422 로 거부한다.
 *   - 정상 동의가 포함된 가입은 201 이고, 이후 로그인 가능하다.
 *   - /me/consents 는 동일 버전 중복 호출을 idempotent 하게 200 처리한다.
 */

const BASE = process.env.PHASE_R_BASE ?? process.env.PHASE_SMOKE_BASE ?? 'http://localhost:3000';

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

async function authed(token, path, init = {}) {
  return req(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
}

async function main() {
  console.log(`Phase R (mobile policy consent) smoke @ ${BASE}`);
  console.log('='.repeat(60));

  const terms = await req('/public/policies/terms');
  log(
    'GET /public/policies/terms 200 + version',
    terms.status === 200 && Number.isInteger(terms.body?.version),
    `status=${terms.status}, version=${terms.body?.version}`,
  );

  const privacy = await req('/public/policies/privacy');
  log(
    'GET /public/policies/privacy 200 + version',
    privacy.status === 200 && Number.isInteger(privacy.body?.version),
    `status=${privacy.status}, version=${privacy.body?.version}`,
  );

  const email = `phase-r-${Date.now()}@example.com`;
  const password = 'phase-r-123';
  const consents = {
    terms: { version: terms.body?.version },
    privacy: { version: privacy.body?.version },
  };

  const missingConsent = await req('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email: `missing-${email}`, password, ageConfirmed: true }),
  });
  log('POST /auth/signup 동의 누락 → 422', missingConsent.status === 422, `status=${missingConsent.status}`);

  const missingAge = await req('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email: `age-${email}`, password, ageConfirmed: false, consents }),
  });
  log('POST /auth/signup ageConfirmed=false → 422', missingAge.status === 422, `status=${missingAge.status}`);

  const signup = await req('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, ageConfirmed: true, consents }),
  });
  log('POST /auth/signup 정상 동의 포함 → 201', signup.status === 201, `status=${signup.status}`);

  const login = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const token = login.body?.accessToken;
  log('가입 계정 로그인 가능', login.status === 200 && typeof token === 'string', `status=${login.status}`);

  if (typeof token === 'string') {
    const consentAgain1 = await authed(token, '/me/consents', {
      method: 'POST',
      body: JSON.stringify({ ageConfirmed: true, consents, source: 'phase-r-smoke' }),
    });
    log('POST /me/consents 1차 중복 저장 200', consentAgain1.status === 200, `status=${consentAgain1.status}`);

    const consentAgain2 = await authed(token, '/me/consents', {
      method: 'POST',
      body: JSON.stringify({ ageConfirmed: true, consents, source: 'phase-r-smoke' }),
    });
    log('POST /me/consents 2차 idempotent 200', consentAgain2.status === 200, `status=${consentAgain2.status}`);
  } else {
    log('POST /me/consents 1차 중복 저장 200', false, 'login token missing');
    log('POST /me/consents 2차 idempotent 200', false, 'login token missing');
  }

  console.log('-'.repeat(60));
  console.log(`Phase R smoke result: ${passed} passed / ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error('UNCAUGHT', e);
  process.exitCode = 2;
});
