import '../loadEnv.js';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { prisma } from '../lib/prisma.js';
import { signAccess } from '../lib/jwt.js';
import { mealSetRouter } from './mealSet.js';

/**
 * ATDD-lite GREEN — 끼니 세트(meal-set) 수용 기준 통합 테스트.
 *
 * 근거: docs/requirements/feature-mobile-meal-set-prd.md §11 (AC-01..AC-17)
 * 실 DB(DATABASE_URL) + JWT 서명 + 임시 http 서버 + fetch로 API 계약(§10)을 검증한다.
 *
 * 백엔드 범위 AC를 자동화한다. AC-04 원자성은 트랜잭션 내 실패 주입으로 롤백을 검증한다.
 * 프론트/인프라 의존 AC는 앱(클라이언트) 책임으로 남긴다:
 * - AC-09 빈 상태 / AC-10 토큰 재발급 / AC-14 타임아웃 / AC-16 캐시.
 *   (AC-07 멱등으로 재시도 동등 동작은 서버에서 커버 → AC-14는 멱등 동작에 위임.)
 */

const app = express();
app.use(express.json());
app.use(mealSetRouter);

let server: http.Server;
let base: string;
let userId: string;
let otherUserId: string;
let token: string;
let otherToken: string;
let tpl1: string;
let tpl2: string;
let tpl3: string;
let tplInactive: string;

type Json = Record<string, any>;
async function req(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown } = {},
): Promise<{ status: number; json: Json }> {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : {} };
}

const completeNutrition = {
  portionUnit: 'PIECE' as const,
  referenceAmount: 1,
  servingGrams: 100,
  calories: 200,
  protein: 20,
  fat: 5,
  carbohydrate: 10,
};

function templateItem(foodTemplateId: string) {
  return { kind: 'template' as const, foodTemplateId, mealInputMode: 'PORTION_COUNT' as const, portionQuantity: 1 };
}

function manualItem(name: string) {
  return { kind: 'manual' as const, name, calories: 150, protein: 10, carbohydrate: 20, fat: 5, grams: 120 };
}

before(async () => {
  const stamp = Date.now();
  const user = await prisma.user.create({
    data: { email: `mealset-acc-${stamp}@test.local`, passwordHash: 'x', role: 'USER', active: true },
  });
  const other = await prisma.user.create({
    data: { email: `mealset-acc-other-${stamp}@test.local`, passwordHash: 'x', role: 'USER', active: true },
  });
  userId = user.id;
  otherUserId = other.id;
  token = signAccess(userId, 'USER');
  otherToken = signAccess(otherUserId, 'USER');

  const [a, b, c, inactive] = await Promise.all([
    prisma.foodTemplate.create({ data: { name: `삶은 계란 ${stamp}`, active: true, ...completeNutrition } }),
    prisma.foodTemplate.create({ data: { name: `통밀 토스트 ${stamp}`, active: true, ...completeNutrition } }),
    prisma.foodTemplate.create({ data: { name: `저지방 우유 ${stamp}`, active: true, ...completeNutrition } }),
    prisma.foodTemplate.create({ data: { name: `단종 음식 ${stamp}`, active: false, ...completeNutrition } }),
  ]);
  tpl1 = a.id;
  tpl2 = b.id;
  tpl3 = c.id;
  tplInactive = inactive.id;

  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.meal.deleteMany({ where: { userId: { in: [userId, otherUserId] } } });
  await prisma.mealSet.deleteMany({ where: { userId: { in: [userId, otherUserId] } } });
  await prisma.foodTemplate.deleteMany({ where: { id: { in: [tpl1, tpl2, tpl3, tplInactive] } } });
  await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
  await prisma.$disconnect();
});

describe('meal-set: 세트 CRUD (POST/GET/PUT/PATCH /me/meal-sets)', () => {
  it('AC-01 세트 생성: 이름·기본 끼니·항목 2개 저장 시 활성 상태로 목록에 노출', async () => {
    const created = await req('POST', '/me/meal-sets', {
      token,
      body: { name: 'AC01 아침 세트', defaultMealSlot: 'BREAKFAST', items: [templateItem(tpl1), templateItem(tpl2)] },
    });
    assert.equal(created.status, 201);
    assert.equal(created.json.items.length, 2);
    assert.ok(created.json.id);

    const list = await req('GET', '/me/meal-sets', { token });
    assert.equal(list.status, 200);
    assert.ok(list.json.items.some((s: Json) => s.id === created.json.id));
  });

  it('AC-02 빈 항목 검증: 항목 0개 저장 시 422 VALIDATION_FAILED', async () => {
    const res = await req('POST', '/me/meal-sets', {
      token,
      body: { name: 'AC02 빈 세트', defaultMealSlot: 'LUNCH', items: [] },
    });
    assert.equal(res.status, 422);
    assert.equal(res.json.code, 'VALIDATION_FAILED');
  });

  it('AC-12 상한 검증: 항목 21개 이상 저장 시 422 VALIDATION_FAILED', async () => {
    const items = Array.from({ length: 21 }, () => templateItem(tpl1));
    const res = await req('POST', '/me/meal-sets', {
      token,
      body: { name: 'AC12 항목 초과', defaultMealSlot: 'LUNCH', items },
    });
    assert.equal(res.status, 422);
    assert.equal(res.json.code, 'VALIDATION_FAILED');
  });

  it('AC-11 소유권/404: 타인/존재하지 않는 세트 접근 시 404 NOT_FOUND', async () => {
    const mine = await req('POST', '/me/meal-sets', {
      token,
      body: { name: 'AC11 내 세트', defaultMealSlot: 'BREAKFAST', items: [templateItem(tpl1)] },
    });
    const id = mine.json.id;

    const getOther = await req('GET', `/me/meal-sets/${id}`, { token: otherToken });
    assert.equal(getOther.status, 404);
    assert.equal(getOther.json.code, 'NOT_FOUND');

    const missing = await req('GET', '/me/meal-sets/does-not-exist', { token });
    assert.equal(missing.status, 404);

    const putOther = await req('PUT', `/me/meal-sets/${id}`, {
      token: otherToken,
      body: { name: 'x', defaultMealSlot: 'BREAKFAST', items: [templateItem(tpl1)] },
    });
    assert.equal(putOther.status, 404);

    const applyOther = await req('POST', `/me/meal-sets/${id}/apply`, {
      token: otherToken,
      body: { clientRequestId: crypto.randomUUID() },
    });
    assert.equal(applyOther.status, 404);
  });

  it('수기 항목 생성: kind=manual 저장 시 name/영양 스냅샷 보존, foodTemplateId=null', async () => {
    const created = await req('POST', '/me/meal-sets', {
      token,
      body: { name: '수기 세트', defaultMealSlot: 'LUNCH', items: [manualItem('집밥 한공기'), templateItem(tpl1)] },
    });
    assert.equal(created.status, 201);
    const manual = created.json.items.find((it: Json) => it.kind === 'manual');
    assert.ok(manual);
    assert.equal(manual.name, '집밥 한공기');
    assert.equal(manual.calories, 150);
    assert.equal(manual.protein, 10);
    assert.equal(manual.grams, 120);
    assert.equal(manual.foodTemplateId, null);
    assert.equal(manual.mealInputMode, null);
  });

  it('수기 항목 검증: name 누락 시 422 VALIDATION_FAILED', async () => {
    const res = await req('POST', '/me/meal-sets', {
      token,
      body: { name: '수기 검증', defaultMealSlot: 'LUNCH', items: [{ kind: 'manual', calories: 100, protein: 1, carbohydrate: 1, fat: 1 }] },
    });
    assert.equal(res.status, 422);
    assert.equal(res.json.code, 'VALIDATION_FAILED');
  });

  it('AC-08 비활성화: deactivate 후 목록 제외, 과거 Meal 기록은 보존', async () => {
    const set = await req('POST', '/me/meal-sets', {
      token,
      body: { name: 'AC08 사용된 세트', defaultMealSlot: 'BREAKFAST', items: [templateItem(tpl1)] },
    });
    const id = set.json.id;
    const applied = await req('POST', `/me/meal-sets/${id}/apply`, {
      token,
      body: { clientRequestId: crypto.randomUUID() },
    });
    assert.equal(applied.status, 200);
    const createdMealId = applied.json.createdMealIds[0];

    const deact = await req('PATCH', `/me/meal-sets/${id}/deactivate`, { token });
    assert.equal(deact.status, 200);

    const list = await req('GET', '/me/meal-sets', { token });
    assert.ok(!list.json.items.some((s: Json) => s.id === id));

    const meal = await prisma.meal.findUnique({ where: { id: createdMealId } });
    assert.ok(meal && meal.active);

    // 멱등: 이미 비활성도 성공
    const deactAgain = await req('PATCH', `/me/meal-sets/${id}/deactivate`, { token });
    assert.equal(deactAgain.status, 200);
  });
});

describe('meal-set: 한 번에 등록 (POST /me/meal-sets/{id}/apply)', () => {
  async function makeSet(body: Json): Promise<string> {
    const res = await req('POST', '/me/meal-sets', { token, body });
    assert.equal(res.status, 201);
    return res.json.id;
  }

  it('AC-03 정상 등록: 항목 3개를 오늘·아침으로 등록 시 Meal 3건 생성, 모두 BREAKFAST', async () => {
    const id = await makeSet({
      name: 'AC03 세트',
      defaultMealSlot: 'BREAKFAST',
      items: [templateItem(tpl1), templateItem(tpl2), templateItem(tpl3)],
    });
    const res = await req('POST', `/me/meal-sets/${id}/apply`, {
      token,
      body: { clientRequestId: crypto.randomUUID() },
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.createdMealIds.length, 3);
    const meals = await prisma.meal.findMany({ where: { id: { in: res.json.createdMealIds } } });
    assert.equal(meals.length, 3);
    assert.ok(meals.every((m) => m.mealSlot === 'BREAKFAST'));
  });

  it('AC-06 끼니 override: 기본 아침 세트를 점심으로 등록 시 모든 Meal mealSlot=LUNCH', async () => {
    const id = await makeSet({
      name: 'AC06 세트',
      defaultMealSlot: 'BREAKFAST',
      items: [templateItem(tpl1), templateItem(tpl2)],
    });
    const res = await req('POST', `/me/meal-sets/${id}/apply`, {
      token,
      body: { clientRequestId: crypto.randomUUID(), mealSlot: 'LUNCH' },
    });
    assert.equal(res.status, 200);
    const meals = await prisma.meal.findMany({ where: { id: { in: res.json.createdMealIds } } });
    assert.ok(meals.every((m) => m.mealSlot === 'LUNCH'));
  });

  it('AC-13 간식 슬롯 조합: SNACK 세트를 LUNCH로 override 시 snackPlacement=null', async () => {
    const id = await makeSet({
      name: 'AC13 간식 세트',
      defaultMealSlot: 'SNACK',
      defaultSnackPlacement: 'AFTER_DINNER',
      items: [templateItem(tpl1)],
    });
    const res = await req('POST', `/me/meal-sets/${id}/apply`, {
      token,
      body: { clientRequestId: crypto.randomUUID(), mealSlot: 'LUNCH' },
    });
    assert.equal(res.status, 200);
    const meals = await prisma.meal.findMany({ where: { id: { in: res.json.createdMealIds } } });
    assert.ok(meals.every((m) => m.snackPlacement === null && m.mealSlot === 'LUNCH'));
  });

  it('AC-07 멱등 등록: 동일 clientRequestId 2회 요청 시 중복 없이 동일 createdMealIds 반환', async () => {
    const id = await makeSet({
      name: 'AC07 세트',
      defaultMealSlot: 'BREAKFAST',
      items: [templateItem(tpl1), templateItem(tpl2)],
    });
    const cid = crypto.randomUUID();
    const first = await req('POST', `/me/meal-sets/${id}/apply`, { token, body: { clientRequestId: cid } });
    const second = await req('POST', `/me/meal-sets/${id}/apply`, { token, body: { clientRequestId: cid } });
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.deepEqual([...second.json.createdMealIds].sort(), [...first.json.createdMealIds].sort());
    const count = await prisma.meal.count({ where: { userId, clientRequestId: { startsWith: `${cid}:` } } });
    assert.equal(count, 2);
  });

  it('AC-17 미래 일자 차단: consumedAt 미래 일자 등록 시 422 VALIDATION_FAILED', async () => {
    const id = await makeSet({
      name: 'AC17 세트',
      defaultMealSlot: 'BREAKFAST',
      items: [templateItem(tpl1)],
    });
    const future = new Date(Date.now() + 2 * 86_400_000).toISOString();
    const res = await req('POST', `/me/meal-sets/${id}/apply`, {
      token,
      body: { clientRequestId: crypto.randomUUID(), consumedAt: future },
    });
    assert.equal(res.status, 422);
    assert.equal(res.json.code, 'VALIDATION_FAILED');
  });

  it('AC-05/AC-15 비활성 템플릿 사전 검증: 409 MEAL_SET_ITEM_UNAVAILABLE, 제외 후 200', async () => {
    const id = await makeSet({
      name: 'AC05 세트',
      defaultMealSlot: 'BREAKFAST',
      items: [templateItem(tpl1), templateItem(tplInactive)],
    });
    const blocked = await req('POST', `/me/meal-sets/${id}/apply`, {
      token,
      body: { clientRequestId: crypto.randomUUID() },
    });
    assert.equal(blocked.status, 409);
    assert.equal(blocked.json.code, 'MEAL_SET_ITEM_UNAVAILABLE');
    const badItems = blocked.json.details.items as Json[];
    assert.ok(Array.isArray(badItems) && badItems.length === 1);

    // 문제 항목 제외 후 등록 (D3)
    const detail = await req('GET', `/me/meal-sets/${id}`, { token });
    const inactiveItemId = detail.json.items.find((it: Json) => it.foodTemplateId === tplInactive).id;
    const ok = await req('POST', `/me/meal-sets/${id}/apply`, {
      token,
      body: { clientRequestId: crypto.randomUUID(), excludeItemIds: [inactiveItemId] },
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.createdMealIds.length, 1);
    assert.deepEqual(ok.json.skippedItemIds, [inactiveItemId]);
  });

  it('AC-07b 빈 등록 대상: 모든 항목 제외 시 422 VALIDATION_FAILED', async () => {
    const detail = await makeSet({
      name: 'AC07b 세트',
      defaultMealSlot: 'BREAKFAST',
      items: [templateItem(tpl1)],
    });
    const set = await req('GET', `/me/meal-sets/${detail}`, { token });
    const onlyItemId = set.json.items[0].id;
    const res = await req('POST', `/me/meal-sets/${detail}/apply`, {
      token,
      body: { clientRequestId: crypto.randomUUID(), excludeItemIds: [onlyItemId] },
    });
    assert.equal(res.status, 422);
    assert.equal(res.json.code, 'VALIDATION_FAILED');
  });

  it('수기 항목 등록: manual 스냅샷으로 수기 Meal 생성(foodTemplateId=null), 사전검증 무관', async () => {
    const id = await makeSet({
      name: '수기 적용 세트',
      defaultMealSlot: 'DINNER',
      items: [manualItem('떡볶이'), templateItem(tplInactive)],
    });
    // 비활성 템플릿만 409로 막히고 manual은 unavailable 목록에 포함되지 않음
    const blocked = await req('POST', `/me/meal-sets/${id}/apply`, {
      token,
      body: { clientRequestId: crypto.randomUUID() },
    });
    assert.equal(blocked.status, 409);
    assert.equal((blocked.json.details.items as Json[]).length, 1);

    // 비활성 템플릿 제외 후 manual 항목만 등록
    const detail = await req('GET', `/me/meal-sets/${id}`, { token });
    const inactiveItemId = detail.json.items.find((it: Json) => it.foodTemplateId === tplInactive).id;
    const ok = await req('POST', `/me/meal-sets/${id}/apply`, {
      token,
      body: { clientRequestId: crypto.randomUUID(), excludeItemIds: [inactiveItemId] },
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.createdMealIds.length, 1);
    const meal = await prisma.meal.findUnique({ where: { id: ok.json.createdMealIds[0] } });
    assert.ok(meal);
    assert.equal(meal!.foodTemplateId, null);
    assert.equal(meal!.name, '떡볶이');
    assert.equal(meal!.calories, 150);
    assert.equal(meal!.mealSlot, 'DINNER');
  });

  it('AC-04 원자성: 트랜잭션 중 일부 항목 저장 실패 시 전체 롤백(부분 저장 없음)', async () => {
    const id = await makeSet({
      name: 'AC04 세트',
      defaultMealSlot: 'BREAKFAST',
      items: [templateItem(tpl1), templateItem(tpl2)],
    });
    const cid = crypto.randomUUID();

    // 트랜잭션 내 2번째 meal.create에 실패를 주입 → 실제 DB 롤백 검증
    const origTx = prisma.$transaction.bind(prisma);
    (prisma as any).$transaction = (arg: any, opts: any) => {
      if (typeof arg !== 'function') return origTx(arg, opts);
      return origTx(async (tx: any) => {
        let creates = 0;
        const txProxy = new Proxy(tx, {
          get(target, prop, receiver) {
            if (prop === 'meal') {
              const mealClient = target.meal;
              return new Proxy(mealClient, {
                get(mt, mp) {
                  if (mp === 'create') {
                    return async (a: any) => {
                      creates += 1;
                      if (creates === 2) throw new Error('INJECTED_FAILURE');
                      return mt.create(a);
                    };
                  }
                  const v = (mt as any)[mp];
                  return typeof v === 'function' ? v.bind(mt) : v;
                },
              });
            }
            const v = Reflect.get(target, prop, receiver);
            return typeof v === 'function' ? v.bind(target) : v;
          },
        });
        return arg(txProxy);
      }, opts);
    };

    try {
      const res = await req('POST', `/me/meal-sets/${id}/apply`, { token, body: { clientRequestId: cid } });
      assert.equal(res.status, 500);
    } finally {
      (prisma as any).$transaction = origTx;
    }

    // 부분 저장이 없어야 함(전체 롤백)
    const count = await prisma.meal.count({ where: { userId, clientRequestId: { startsWith: `${cid}:` } } });
    assert.equal(count, 0);
  });
});
