import '../loadEnv.js';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { prisma } from '../lib/prisma.js';
import { signAccess } from '../lib/jwt.js';
import { meRouter } from './me.js';
import { adminRouter } from './admin.js';

/**
 * ATDD-lite — NutritionFood 검색 API
 * PRD: docs/requirements/feature-nutrition-food-db-prd.md v0.4 (AC-02..AC-13 HTTP)
 */

const app = express();
app.use(express.json());
app.use(meRouter);
app.use(adminRouter);

let server: http.Server;
let base: string;
let userId: string;
let adminId: string;
let userToken: string;
let adminToken: string;
const stamp = Date.now();
const activeExt = `NF-A-${stamp}`;
const inactiveExt = `NF-I-${stamp}`;

type Json = Record<string, unknown>;
async function req(
  method: string,
  path: string,
  opts: { token?: string } = {},
): Promise<{ status: number; json: Json }> {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : {} };
}

before(async () => {
  const user = await prisma.user.create({
    data: { email: `nf-user-${stamp}@test.local`, passwordHash: 'x', role: 'USER', active: true },
  });
  const admin = await prisma.user.create({
    data: { email: `nf-admin-${stamp}@test.local`, passwordHash: 'x', role: 'ADMIN', active: true },
  });
  userId = user.id;
  adminId = admin.id;
  userToken = signAccess(userId, 'USER');
  adminToken = signAccess(adminId, 'ADMIN');

  await prisma.nutritionFood.createMany({
    data: [
      {
        source: 'MFDS',
        externalId: activeExt,
        name: `닭가슴살 구운것 ${stamp}`,
        nameNormalized: `닭가슴살 구운것 ${stamp}`,
        category: '육류',
        per100gCalories: 165,
        per100gProtein: 31,
        per100gFat: 3.6,
        per100gCarbohydrate: 0,
        defaultServingGrams: 100,
        sourceVersion: 'test',
        importedAt: new Date(),
        active: true,
      },
      {
        source: 'MFDS',
        externalId: inactiveExt,
        name: `닭가슴살 비활성 ${stamp}`,
        nameNormalized: `닭가슴살 비활성 ${stamp}`,
        category: '육류',
        per100gCalories: 100,
        per100gProtein: 20,
        per100gFat: 1,
        per100gCarbohydrate: 0,
        sourceVersion: 'test',
        importedAt: new Date(),
        active: false,
        deactivatedAt: new Date(),
      },
    ],
  });

  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.nutritionFood.deleteMany({
    where: { externalId: { in: [activeExt, inactiveExt] } },
  });
  await prisma.user.deleteMany({ where: { id: { in: [userId, adminId] } } });
  await prisma.$disconnect();
});

describe('NutritionFood API', () => {
  it('AC-13: GET /me/nutrition-foods path works (not /nutrition-foods shortcut)', async () => {
    const ok = await req('GET', `/me/nutrition-foods?q=${encodeURIComponent(`닭가슴살 구운것 ${stamp}`)}`, {
      token: userToken,
    });
    assert.equal(ok.status, 200);
    const bad = await req('GET', '/nutrition-foods', { token: userToken });
    assert.notEqual(bad.status, 200);
  });

  it('AC-02: partial name match returns per100g fields', async () => {
    const res = await req('GET', `/me/nutrition-foods?q=${encodeURIComponent('닭가슴살 구운')}`, {
      token: userToken,
    });
    assert.equal(res.status, 200);
    const items = res.json.items as Array<Record<string, unknown>>;
    assert.ok(items.some((i) => i.externalId === activeExt));
    const hit = items.find((i) => i.externalId === activeExt)!;
    const per = hit.per100g as Record<string, number>;
    assert.equal(per.calories, 165);
    assert.equal(per.protein, 31);
    assert.equal(per.fat, 3.6);
    assert.equal(per.carbohydrate, 0);
  });

  it('AC-05: auth — unauth 401, USER admin 403, ADMIN admin 200, ADMIN me 403', async () => {
    const unauth = await req('GET', '/me/nutrition-foods');
    assert.equal(unauth.status, 401);

    const userAdmin = await req('GET', '/admin/nutrition-foods', { token: userToken });
    assert.equal(userAdmin.status, 403);

    const adminOk = await req('GET', '/admin/nutrition-foods', { token: adminToken });
    assert.equal(adminOk.status, 200);

    const adminMe = await req('GET', '/me/nutrition-foods', { token: adminToken });
    assert.equal(adminMe.status, 403);
  });

  it('AC-06: no match returns empty items', async () => {
    const res = await req('GET', `/me/nutrition-foods?q=${encodeURIComponent(`zzz-no-match-${stamp}`)}`, {
      token: userToken,
    });
    assert.equal(res.status, 200);
    assert.deepEqual(res.json.items, []);
    assert.equal(res.json.total, 0);
  });

  it('AC-07: empty q lists active (200)', async () => {
    const res = await req('GET', '/me/nutrition-foods', { token: userToken });
    assert.equal(res.status, 200);
    assert.ok(typeof res.json.total === 'number');
    assert.ok(Array.isArray(res.json.items));
  });

  it('AC-08: q longer than 60 → 422 field=q', async () => {
    const long = '가'.repeat(61);
    const res = await req('GET', `/me/nutrition-foods?q=${encodeURIComponent(long)}`, {
      token: userToken,
    });
    assert.equal(res.status, 422);
    assert.equal(res.json.code, 'VALIDATION_FAILED');
    assert.equal((res.json.details as { field?: string })?.field, 'q');
  });

  it('AC-09: page/size clamp; oversized page returns empty items with total', async () => {
    const clamp = await req('GET', '/me/nutrition-foods?page=0&size=999', { token: userToken });
    assert.equal(clamp.status, 200);
    assert.equal(clamp.json.page, 1);
    assert.equal(clamp.json.size, 100);

    const over = await req('GET', '/me/nutrition-foods?page=99999&size=15', { token: userToken });
    assert.equal(over.status, 200);
    assert.deepEqual(over.json.items, []);
    assert.ok((over.json.total as number) >= 0);
  });

  it('AC-10: USER hides inactive; admin includeInactive shows it', async () => {
    const userRes = await req('GET', `/me/nutrition-foods?q=${encodeURIComponent(`닭가슴살 비활성 ${stamp}`)}`, {
      token: userToken,
    });
    assert.equal(userRes.status, 200);
    const userItems = userRes.json.items as Array<{ externalId: string }>;
    assert.ok(!userItems.some((i) => i.externalId === inactiveExt));

    const adminRes = await req(
      'GET',
      `/admin/nutrition-foods?q=${encodeURIComponent(`닭가슴살 비활성 ${stamp}`)}&includeInactive=true`,
      { token: adminToken },
    );
    assert.equal(adminRes.status, 200);
    const adminItems = adminRes.json.items as Array<{ externalId: string; active: boolean }>;
    assert.ok(adminItems.some((i) => i.externalId === inactiveExt && i.active === false));
  });
});
