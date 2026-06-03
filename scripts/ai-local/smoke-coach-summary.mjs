#!/usr/bin/env node
/**
 * Coach summary smoke — requires dev server + AI_ENABLED + seed user.
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

  const res = await fetch(`${API}/me/ai/coach/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();

  if (res.status !== 200) {
    console.error('FAIL: coach/summary', res.status, body);
    process.exit(1);
  }

  const ok =
    body.anchor &&
    body.today?.summary &&
    body.week?.goalAchievement &&
    typeof body.insight?.text === 'string' &&
    Array.isArray(body.suggestedQuestions) &&
    body.suggestedQuestions.length >= 1;

  console.log(
    'OK: coach/summary',
    `anchor=${body.anchor}`,
    `weekMeals=${body.week?.mealCount}`,
    `questions=${body.suggestedQuestions?.length}`,
    `evidence=${body.evidenceMeals?.length}`,
    `frequent=${body.frequentFoods?.length}`,
  );

  if (!ok) {
    console.error('FAIL: response shape');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
