#!/usr/bin/env node
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
  return (await res.json()).accessToken;
}

async function main() {
  const token = await login();
  const legacy = await fetch(`${API}/me/ai/reports/weekly`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (legacy.status !== 404) {
    console.error('FAIL: /me/ai/reports/weekly should be 404');
    process.exit(1);
  }

  const res = await fetch(`${API}/me/insights/reports/weekly`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (res.status !== 200) {
    console.error('FAIL', res.status, body);
    process.exit(1);
  }
  const ok =
    body.sections?.keyMetrics &&
    Array.isArray(body.sections.evidence) &&
    Array.isArray(body.sections.nextWeekGoals) &&
    typeof body.summaryText === 'string' &&
    body.llm === undefined;
  if (!ok) {
    console.error('FAIL shape', body);
    process.exit(1);
  }
  console.log(
    `OK: weekly anchor=${body.period.anchor} goals=${body.sections.nextWeekGoals.length} evidence=${body.sections.evidence.length}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
