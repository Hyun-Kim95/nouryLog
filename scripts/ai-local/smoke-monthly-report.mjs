#!/usr/bin/env node
/**
 * Monthly pattern report smoke — requires dev server + AI_ENABLED + seed user.
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

async function main() {
  const token = await login();
  console.log('OK: login');

  const res = await fetch(`${API}/me/ai/reports/monthly`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();

  if (res.status !== 200) {
    console.error('FAIL: reports/monthly', res.status, body);
    process.exit(1);
  }

  const ok =
    body.period?.anchor &&
    body.sections?.keyMetrics &&
    Array.isArray(body.sections.recurringPatterns) &&
    Array.isArray(body.sections.nextMonthGoals) &&
    typeof body.summaryText === 'string';

  if (!ok) {
    console.error('FAIL: shape', body);
    process.exit(1);
  }

  console.log(
    `OK: monthly anchor=${body.period.anchor} patterns=${body.sections.recurringPatterns.length} goals=${body.sections.nextMonthGoals.length}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
