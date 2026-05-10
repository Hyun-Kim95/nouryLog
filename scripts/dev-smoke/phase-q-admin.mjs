#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Phase Q (admin web fixes) — dev smoke.
 *
 * 사용법:
 *   1) `npm run dev:server` 가 떠 있어야 한다 (기본 http://localhost:3000).
 *   2) `node scripts/dev-smoke/phase-q-admin.mjs` 실행.
 *
 * 점검 범위:
 *   - 로그인 시 lastLoginAt 갱신 (admin/users 응답)
 *   - PATCH /admin/users/:id/deactivate body 검증 + activate 토글로 사유 초기화
 *   - 답변 PATCH 가 transitionToDone 미전송에도 status='done' 강제
 *   - PUT/GET /admin/policies/:kind 정책 CRUD + version 증가
 *   - GET /admin/dashboard/timeseries 가 periodDays 만큼 배열 반환
 *   - GET /public/policies/:kind 가 publish 후에만 200, 그 외 404
 *   - POST /admin/notices 의 pinned + publishStart/publishEnd round-trip + 검증
 */

const BASE = process.env.PHASE_Q_ADMIN_BASE ?? process.env.PHASE_SMOKE_BASE ?? 'http://localhost:3000';
const ADMIN = { email: 'admin@example.com', password: 'admin123' };
const USER = { email: 'user@example.com', password: 'user123' };

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

async function login(creds) {
  const r = await req('/auth/login', { method: 'POST', body: JSON.stringify(creds) });
  if (r.status !== 200) throw new Error(`login ${creds.email} ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.accessToken;
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
  console.log(`Phase Q (admin web fixes) smoke @ ${BASE}`);
  console.log('='.repeat(60));

  // 사용자 로그인으로 lastLoginAt 갱신 보장.
  await login(USER);
  const adminToken = await login(ADMIN);
  log('admin login', true);

  // 1) /admin/users items[].lastLoginAt 키 존재 + 사용자 한 명 식별.
  const usersRes = await authed(adminToken, '/admin/users?page=1&size=15&includeInactive=true');
  let userRow = null;
  let lastLoginAtPresent = false;
  if (usersRes.status === 200 && Array.isArray(usersRes.body?.items)) {
    userRow = usersRes.body.items.find((u) => u.email === USER.email);
    lastLoginAtPresent = userRow ? 'lastLoginAt' in userRow : false;
  }
  log(
    '/admin/users 응답에 lastLoginAt 키 포함',
    lastLoginAtPresent && userRow !== null,
    userRow ? `lastLoginAt=${userRow.lastLoginAt}` : `status=${usersRes.status}`,
  );

  if (!userRow) {
    console.log('회원을 찾지 못해 후속 점검을 건너뜁니다.');
    process.exitCode = 1;
    return;
  }

  // 2) deactivate → activate 토글 + 사유 검증.
  const deactNoBody = await authed(adminToken, `/admin/users/${userRow.id}/deactivate`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
  log(
    'PATCH /admin/users/:id/deactivate (reasonCode 누락 → 422)',
    deactNoBody.status === 422,
    `status=${deactNoBody.status}`,
  );

  const deactEtcMissing = await authed(adminToken, `/admin/users/${userRow.id}/deactivate`, {
    method: 'PATCH',
    body: JSON.stringify({ reasonCode: 'etc' }),
  });
  log(
    "PATCH /admin/users/:id/deactivate (reasonCode='etc' + reasonText 누락 → 422)",
    deactEtcMissing.status === 422,
    `status=${deactEtcMissing.status}`,
  );

  const deactReasonText = `phase-q smoke ${Date.now()}`;
  const deact = await authed(adminToken, `/admin/users/${userRow.id}/deactivate`, {
    method: 'PATCH',
    body: JSON.stringify({ reasonCode: 'etc', reasonText: deactReasonText }),
  });
  log(
    "PATCH /admin/users/:id/deactivate (reasonCode='etc' + reasonText)",
    deact.status === 200,
    `status=${deact.status}`,
  );

  const afterDeact = await authed(adminToken, `/admin/users?page=1&size=15&includeInactive=true&query=${encodeURIComponent(USER.email)}`);
  const inactiveRow = afterDeact.body?.items?.find((u) => u.id === userRow.id);
  log(
    'deactivate 후 status=inactive + deactivatedAt 채워짐',
    inactiveRow && inactiveRow.status === 'inactive' && typeof inactiveRow.deactivatedAt === 'string',
    inactiveRow ? `status=${inactiveRow.status}, deactivatedAt=${inactiveRow.deactivatedAt}` : 'row missing',
  );
  log(
    "deactivate 후 deactivationReason round-trip (code='etc', text 일치)",
    inactiveRow?.deactivationReason?.code === 'etc' && inactiveRow?.deactivationReason?.text === deactReasonText,
    `reason=${JSON.stringify(inactiveRow?.deactivationReason ?? null)}`,
  );

  const act = await authed(adminToken, `/admin/users/${userRow.id}/activate`, { method: 'PATCH' });
  log('PATCH /admin/users/:id/activate', act.status === 200, `status=${act.status}`);

  const afterAct = await authed(adminToken, `/admin/users?page=1&size=15&includeInactive=true&query=${encodeURIComponent(USER.email)}`);
  const reActiveRow = afterAct.body?.items?.find((u) => u.id === userRow.id);
  log(
    'activate 후 status=active + deactivatedAt=null + 사유 초기화',
    reActiveRow &&
      reActiveRow.status === 'active' &&
      reActiveRow.deactivatedAt === null &&
      reActiveRow.deactivationReason === null,
    reActiveRow
      ? `status=${reActiveRow.status}, deactivatedAt=${reActiveRow.deactivatedAt}, reason=${JSON.stringify(reActiveRow.deactivationReason)}`
      : 'row missing',
  );

  // 3) 문의 답변이 transitionToDone 미전송에도 status='done' 강제.
  //    기존 시드 데이터에서 done 이 아닌 첫 inquiry 를 사용.
  const inqList = await authed(adminToken, '/admin/inquiries?page=1&size=15&status=pending');
  const inqRow = inqList.body?.items?.[0] ?? null;
  if (inqRow) {
    const ans = await authed(adminToken, `/admin/inquiries/${inqRow.id}/answer`, {
      method: 'PATCH',
      body: JSON.stringify({ answer: `phase-q smoke answer ${Date.now()}` }),
    });
    log(
      'PATCH /admin/inquiries/:id/answer (transitionToDone 미전송)',
      ans.status === 200 && ans.body?.status === 'done',
      `status=${ans.status}, body.status=${ans.body?.status}`,
    );
  } else {
    log('PATCH /admin/inquiries/:id/answer (skip — pending 문의 없음)', true, 'no pending row, skipping');
  }

  // 4) 정책 CRUD: terms.
  const termsKind = 'terms';
  const initial = await authed(adminToken, `/admin/policies/${termsKind}`);
  const initialVersion = initial.body?.version ?? 0;
  log('GET /admin/policies/terms 초기 응답', initial.status === 200, `version=${initialVersion}`);

  const put1 = await authed(adminToken, `/admin/policies/${termsKind}`, {
    method: 'PUT',
    body: JSON.stringify({ body: '제1조 (목적) phase-q smoke 1차 본문', publish: false }),
  });
  log(
    'PUT /admin/policies/terms publish=false',
    (put1.status === 200 || put1.status === 201) && put1.body?.publishedAt === null,
    `status=${put1.status}, version=${put1.body?.version}`,
  );
  const versionAfter1 = put1.body?.version ?? -1;

  const put2 = await authed(adminToken, `/admin/policies/${termsKind}`, {
    method: 'PUT',
    body: JSON.stringify({ body: '제1조 (목적) phase-q smoke 2차 본문', publish: true }),
  });
  log(
    'PUT /admin/policies/terms publish=true (version 증가)',
    put2.status === 200 && put2.body?.version === versionAfter1 + 1 && typeof put2.body?.publishedAt === 'string',
    `status=${put2.status}, version=${put2.body?.version}, publishedAt=${put2.body?.publishedAt}`,
  );

  const getAfter = await authed(adminToken, `/admin/policies/${termsKind}`);
  log(
    'GET /admin/policies/terms 가 마지막 PUT 결과 반영',
    getAfter.status === 200 && getAfter.body?.body === '제1조 (목적) phase-q smoke 2차 본문',
    `body length=${getAfter.body?.body?.length ?? 0}`,
  );

  // 5) /admin/dashboard/timeseries 응답 길이.
  const ts7 = await authed(adminToken, '/admin/dashboard/timeseries?periodDays=7');
  log(
    'GET /admin/dashboard/timeseries?periodDays=7',
    ts7.status === 200 && Array.isArray(ts7.body?.items) && ts7.body.items.length === 7,
    `status=${ts7.status}, length=${ts7.body?.items?.length}`,
  );

  // 6) 공개 정책 라우트.
  const publicTerms = await req(`/public/policies/${termsKind}`);
  log(
    'GET /public/policies/terms (publish 후 200)',
    publicTerms.status === 200 && publicTerms.body?.kind === termsKind,
    `status=${publicTerms.status}`,
  );

  const publicPrivacy = await req('/public/policies/privacy');
  log(
    'GET /public/policies/privacy (미게시 → 404)',
    publicPrivacy.status === 404,
    `status=${publicPrivacy.status}`,
  );

  // 7) 공지 pinned + 게시기간 round-trip + 검증.
  const startIso = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const endIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const noticeCreate = await authed(adminToken, '/admin/notices', {
    method: 'POST',
    body: JSON.stringify({
      title: `phase-q pinned ${Date.now()}`,
      body: 'phase-q smoke pinned notice',
      pinned: true,
      publishStart: startIso,
      publishEnd: endIso,
    }),
  });
  log(
    'POST /admin/notices pinned + 게시기간',
    noticeCreate.status === 201 && typeof noticeCreate.body?.id === 'string',
    `status=${noticeCreate.status}, id=${noticeCreate.body?.id}`,
  );
  const newNoticeId = noticeCreate.body?.id ?? null;

  const noticeList = await authed(adminToken, '/admin/notices?page=1&size=15&includeInactive=true');
  const firstItem = noticeList.body?.items?.[0] ?? null;
  log(
    'GET /admin/notices: pinned 공지가 첫 항목 + 응답에 신규 필드 포함',
    firstItem &&
      firstItem.id === newNoticeId &&
      firstItem.pinned === true &&
      typeof firstItem.publishStart === 'string' &&
      typeof firstItem.publishEnd === 'string',
    `first=${JSON.stringify({
      id: firstItem?.id,
      pinned: firstItem?.pinned,
      publishStart: firstItem?.publishStart,
      publishEnd: firstItem?.publishEnd,
    })}`,
  );

  if (newNoticeId) {
    const detail = await authed(adminToken, `/admin/notices/${newNoticeId}`);
    log(
      'GET /admin/notices/:id 응답에 publishStart/publishEnd 일치',
      detail.status === 200 &&
        detail.body?.publishStart === startIso &&
        detail.body?.publishEnd === endIso,
      `status=${detail.status}, start=${detail.body?.publishStart}, end=${detail.body?.publishEnd}`,
    );
  }

  const noticeInvalid = await authed(adminToken, '/admin/notices', {
    method: 'POST',
    body: JSON.stringify({
      title: `phase-q invalid ${Date.now()}`,
      body: 'invalid range',
      publishStart: endIso,
      publishEnd: startIso,
    }),
  });
  log(
    'POST /admin/notices publishStart > publishEnd → 422',
    noticeInvalid.status === 422,
    `status=${noticeInvalid.status}`,
  );

  console.log('-'.repeat(60));
  console.log(`Phase Q smoke result: ${passed} passed / ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error('UNCAUGHT', e);
  process.exitCode = 2;
});
