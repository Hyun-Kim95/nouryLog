import { Router, type Request, type Response } from 'express';
import { PortionUnit, type Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { resolvedReferenceAmount } from '../lib/foodTemplateReference.js';
import { normalizePortionLabel, resolvePortionUnit, validatePortionLabelForUnit } from '../lib/portionUnit.js';
import { requireAdmin } from '../middleware/requireAuth.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { sendError, ErrorCodes } from '../lib/errors.js';
import { runPurgeInactive } from '../lib/purgeInactive.js';
import { softActivateFields, softDeactivateFields } from '../lib/retention.js';
import {
  ADMIN_DEACTIVATION_REASON_CODES,
  validateAdminDeactivationReason,
} from '../lib/deactivationReason.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

const INQUIRY_STATUSES = ['pending', 'in_progress', 'done'] as const;
type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

const CATEGORY_MAX_LEN = 50;
const ANSWER_MAX_LEN = 4000;
const DEFAULT_PERIOD_DAYS = 7;
const MAX_PERIOD_DAYS = 90;
const TIMEZONE = 'Asia/Seoul';

function paginate(q: Request['query']) {
  const page = Math.max(1, Number(q.page ?? 1));
  const size = Math.min(100, Math.max(1, Number(q.size ?? 15)));
  return { page, size, skip: (page - 1) * size };
}

function parseIsoDate(input: unknown): Date | null {
  if (input === undefined || input === null || input === '') return null;
  const s = String(input).trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

type DateRange = { from: Date | null; to: Date | null; error?: string };

function parseDateRange(q: Request['query']): DateRange {
  const fromRaw = q.from;
  const toRaw = q.to;
  const from = fromRaw !== undefined ? parseIsoDate(fromRaw) : null;
  const to = toRaw !== undefined ? parseIsoDate(toRaw) : null;
  if (fromRaw !== undefined && fromRaw !== '' && !from) {
    return { from: null, to: null, error: 'from은 ISO 8601 날짜여야 합니다.' };
  }
  if (toRaw !== undefined && toRaw !== '' && !to) {
    return { from: null, to: null, error: 'to는 ISO 8601 날짜여야 합니다.' };
  }
  if (from && to && from.getTime() > to.getTime()) {
    return { from: null, to: null, error: 'from은 to보다 이후일 수 없습니다.' };
  }
  return { from, to };
}

function isInquiryStatus(v: unknown): v is InquiryStatus {
  return typeof v === 'string' && (INQUIRY_STATUSES as readonly string[]).includes(v);
}

function clampPeriodDays(input: unknown): number {
  const n = Number(input);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_PERIOD_DAYS;
  return Math.min(MAX_PERIOD_DAYS, Math.max(1, Math.floor(n)));
}

function adminUserId(req: Request): string | null {
  return req.auth?.userId ?? null;
}

function dateRangeFilter(range: DateRange): Prisma.DateTimeFilter | undefined {
  if (!range.from && !range.to) return undefined;
  const f: Prisma.DateTimeFilter = {};
  if (range.from) f.gte = range.from;
  if (range.to) f.lte = range.to;
  return f;
}

function rejectInvalidRange(res: Response, range: DateRange): boolean {
  if (range.error) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, range.error);
    return true;
  }
  return false;
}

const STALE_THRESHOLD_HOURS = 6;

function computeStale(aggregatedAt: Date | null, now: Date) {
  if (!aggregatedAt) return { isStale: true, staleHours: null as number | null };
  const diffMs = now.getTime() - aggregatedAt.getTime();
  const hours = Math.max(0, Math.round((diffMs / 3_600_000) * 10) / 10);
  return { isStale: hours >= STALE_THRESHOLD_HOURS, staleHours: hours };
}

adminRouter.patch('/admin/me/password', async (req, res) => {
  const userId = adminUserId(req);
  if (!userId) {
    sendError(res, 401, ErrorCodes.AUTH_UNAUTHORIZED, '인증이 필요합니다.');
    return;
  }
  const b = (req.body ?? {}) as { currentPassword?: unknown; newPassword?: unknown };
  const currentPassword = String(b.currentPassword ?? '');
  const newPassword = String(b.newPassword ?? '');
  if (!currentPassword || !newPassword) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, '현재 비밀번호와 새 비밀번호가 필요합니다.');
    return;
  }
  if (newPassword.length < 6) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, '새 비밀번호는 6자 이상이어야 합니다.');
    return;
  }
  if (newPassword === currentPassword) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, '새 비밀번호는 현재 비밀번호와 달라야 합니다.');
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, role: true, active: true },
  });
  if (!user || user.role !== 'ADMIN') {
    sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '관리자 권한이 필요합니다.');
    return;
  }
  if (!user.active) {
    sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '비활성화된 계정입니다.');
    return;
  }
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    sendError(res, 401, ErrorCodes.AUTH_UNAUTHORIZED, '현재 비밀번호가 올바르지 않습니다.');
    return;
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  res.json({ ok: true });
});

adminRouter.get('/admin/dashboard', async (req, res) => {
  const days = clampPeriodDays(req.query.periodDays);
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - days);

  const [newUsers, activeUsers, mealRecordCount, inquiryCount, batch] = await Promise.all([
    prisma.user.count({
      where: { role: 'USER', createdAt: { gte: from, lte: now } },
    }),
    prisma.meal
      .findMany({
        where: { active: true, consumedAt: { gte: from, lte: now } },
        select: { userId: true },
        distinct: ['userId'],
      })
      .then((rows) => rows.length),
    prisma.meal.count({
      where: { active: true, consumedAt: { gte: from, lte: now } },
    }),
    prisma.inquiry.count({
      where: { active: true, status: { not: 'done' } },
    }),
    prisma.statsBatch.findUnique({ where: { id: 'singleton' } }),
  ]);

  const aggregatedAt = batch?.lastRunAt ?? null;
  const { isStale, staleHours } = computeStale(aggregatedAt, now);

  res.json({
    period: {
      from: from.toISOString(),
      to: now.toISOString(),
      days,
    },
    timezone: TIMEZONE,
    aggregatedAt: aggregatedAt ? aggregatedAt.toISOString() : null,
    isStale,
    staleHours,
    newUsers,
    activeUsers,
    mealRecordCount,
    inquiryCount,
  });
});

adminRouter.get('/admin/dashboard/timeseries', async (req, res) => {
  const days = clampPeriodDays(req.query.periodDays);
  const now = new Date();
  // 일별 0시 기준 슬롯을 만든다. UTC 기준으로 단순 계산(타임존 정밀도는 v1에서 비목표).
  const slots: { from: Date; to: Date; key: string }[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const key = `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, '0')}-${String(
      dayStart.getDate(),
    ).padStart(2, '0')}`;
    slots.push({ from: dayStart, to: dayEnd, key });
  }

  const rangeFrom = slots[0]!.from;
  const rangeTo = slots[slots.length - 1]!.to;

  const [users, meals, inquiries] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: 'USER',
        createdAt: { gte: rangeFrom, lt: rangeTo },
      },
      select: { createdAt: true },
    }),
    prisma.meal.findMany({
      where: {
        active: true,
        consumedAt: { gte: rangeFrom, lt: rangeTo },
      },
      select: { consumedAt: true },
    }),
    prisma.inquiry.findMany({
      where: {
        active: true,
        status: { not: 'done' },
        createdAt: { gte: rangeFrom, lt: rangeTo },
      },
      select: { createdAt: true },
    }),
  ]);

  function bucketKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const newUsersByDay = new Map<string, number>();
  for (const u of users) {
    const k = bucketKey(u.createdAt);
    newUsersByDay.set(k, (newUsersByDay.get(k) ?? 0) + 1);
  }
  const mealsByDay = new Map<string, number>();
  for (const m of meals) {
    const k = bucketKey(m.consumedAt);
    mealsByDay.set(k, (mealsByDay.get(k) ?? 0) + 1);
  }
  const pendingByDay = new Map<string, number>();
  for (const q of inquiries) {
    const k = bucketKey(q.createdAt);
    pendingByDay.set(k, (pendingByDay.get(k) ?? 0) + 1);
  }

  res.json({
    period: {
      from: rangeFrom.toISOString(),
      to: rangeTo.toISOString(),
      days,
    },
    timezone: TIMEZONE,
    items: slots.map((s) => ({
      date: s.key,
      newUsers: newUsersByDay.get(s.key) ?? 0,
      mealRecords: mealsByDay.get(s.key) ?? 0,
      pendingInquiries: pendingByDay.get(s.key) ?? 0,
    })),
  });
});

adminRouter.post('/admin/stats/reaggregate', async (_req, res) => {
  const now = new Date();
  const batch = await prisma.statsBatch.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', lastRunAt: now },
    update: { lastRunAt: now },
  });
  res.status(202).json({
    accepted: true,
    aggregatedAt: batch.lastRunAt.toISOString(),
  });
});

adminRouter.get('/admin/users', async (req, res) => {
  const { page, size, skip } = paginate(req.query);
  const query = String(req.query.query ?? '').trim();
  const status = String(req.query.status ?? 'all');
  const includeInactive = req.query.includeInactive === 'true' || req.query.includeInactive === '1';

  const where: Prisma.UserWhereInput = {
    role: 'USER',
    ...(includeInactive ? {} : { active: true }),
    ...(query ? { email: { contains: query } } : {}),
    ...(status === 'active' ? { active: true } : {}),
    ...(status === 'inactive' ? { active: false } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: size,
      select: {
        id: true,
        email: true,
        active: true,
        deactivatedAt: true,
        deactivationReasonCode: true,
        deactivationReason: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
  ]);

  res.json({
    page,
    size,
    total,
    items: rows.map((u) => ({
      id: u.id,
      email: u.email,
      status: u.active ? 'active' : 'inactive',
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      deactivatedAt: u.deactivatedAt?.toISOString() ?? null,
      deactivationReason: u.deactivationReasonCode
        ? { code: u.deactivationReasonCode, text: u.deactivationReason ?? null }
        : null,
    })),
  });
});

adminRouter.patch('/admin/users/:id/deactivate', async (req, res) => {
  const id = req.params.id;
  const b = (req.body ?? {}) as { reasonCode?: unknown; reasonText?: unknown };
  const validated = validateAdminDeactivationReason(b);
  if (!validated.ok) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, validated.message, {
      field: validated.field,
      allowed: [...ADMIN_DEACTIVATION_REASON_CODES],
    });
    return;
  }
  const user = await prisma.user.findFirst({ where: { id, role: 'USER' } });
  if (!user) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '회원을 찾을 수 없습니다.');
    return;
  }
  await prisma.user.update({
    where: { id },
    data: {
      ...softDeactivateFields(),
      deactivationReasonCode: validated.reasonCode,
      deactivationReason: validated.reasonText,
    },
  });
  res.json({ ok: true });
});

adminRouter.patch('/admin/users/:id/activate', async (req, res) => {
  const id = req.params.id;
  const user = await prisma.user.findFirst({ where: { id, role: 'USER' } });
  if (!user) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '회원을 찾을 수 없습니다.');
    return;
  }
  await prisma.user.update({
    where: { id },
    data: {
      ...softActivateFields(),
      deactivationReasonCode: null,
      deactivationReason: null,
    },
  });
  res.json({ ok: true });
});

type FoodTemplateRow = {
  id: string;
  name: string;
  memo: string | null;
  category: string | null;
  portionUnit: PortionUnit;
  portionLabel: string | null;
  /** 마이그레이션 전 행·구 클라이언트 조회 시 누락될 수 있음 */
  referenceAmount?: number | null;
  servingGrams: number | null;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbohydrate: number | null;
  active: boolean;
  createdAt: Date;
};

function serializeFood(f: FoodTemplateRow) {
  return {
    id: f.id,
    name: f.name,
    memo: f.memo,
    category: f.category,
    portionUnit: f.portionUnit,
    portionLabel: f.portionLabel,
    referenceAmount: resolvedReferenceAmount(f),
    servingGrams: f.servingGrams,
    calories: f.calories,
    protein: f.protein,
    fat: f.fat,
    carbohydrate: f.carbohydrate,
    status: f.active ? 'active' : 'inactive',
    createdAt: f.createdAt.toISOString(),
  };
}

function validateCategory(input: unknown): { value: string | null; error?: string } {
  if (input === undefined || input === null) return { value: null };
  const raw = String(input).trim();
  if (!raw) return { value: null };
  if (raw.length > CATEGORY_MAX_LEN) {
    return { value: null, error: `category는 ${CATEGORY_MAX_LEN}자 이하여야 합니다.` };
  }
  return { value: raw };
}

const FOOD_MACRO_FIELDS = [
  { key: 'calories', max: 10000, label: '칼로리(kcal)' },
  { key: 'protein', max: 1000, label: '단백질(g)' },
  { key: 'fat', max: 1000, label: '지방(g)' },
  { key: 'carbohydrate', max: 1000, label: '탄수화물(g)' },
] as const;

type FoodMacroKey = (typeof FOOD_MACRO_FIELDS)[number]['key'];

type FoodMacroResult =
  | { ok: true; values: Record<FoodMacroKey, number> }
  | { ok: false; field: FoodMacroKey; message: string };

const SERVING_GRAMS_MAX = 5000;
const REFERENCE_AMOUNT_MAX = 5000;

function validateReferenceAmount(input: Record<string, unknown>): { ok: true; value: number } | { ok: false; message: string } {
  const raw = input.referenceAmount;
  if (raw === undefined || raw === null || raw === '') {
    return { ok: false, message: '기준 숫자(referenceAmount)가 필요합니다.' };
  }
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, message: '기준 숫자는 0보다 커야 합니다.' };
  }
  if (n > REFERENCE_AMOUNT_MAX) {
    return { ok: false, message: `기준 숫자는 ${REFERENCE_AMOUNT_MAX} 이하여야 합니다.` };
  }
  return { ok: true, value: n };
}

function validateServingGramsField(raw: unknown): { ok: true; value: number } | { ok: false; message: string } {
  if (raw === undefined || raw === null || raw === '') {
    return { ok: false, message: '기준의 총 질량(servingGrams, g)이 필요합니다.' };
  }
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) {
    return { ok: false, message: '기준의 총 질량(g)은 숫자여야 합니다.' };
  }
  if (n <= 0) {
    return { ok: false, message: '기준의 총 질량(g)은 0보다 커야 합니다.' };
  }
  if (n > SERVING_GRAMS_MAX) {
    return { ok: false, message: `기준의 총 질량(g)은 ${SERVING_GRAMS_MAX} 이하여야 합니다.` };
  }
  return { ok: true, value: n };
}

/** 칼로리·탄단지 4필드 검증. 신규/수정 모두 동일하게 요구한다. */
function validateFoodMacros(input: Record<string, unknown>): FoodMacroResult {
  const values: Partial<Record<FoodMacroKey, number>> = {};
  for (const f of FOOD_MACRO_FIELDS) {
    const raw = input[f.key];
    if (raw === undefined || raw === null || raw === '') {
      return { ok: false, field: f.key, message: `${f.label} 값이 필요합니다.` };
    }
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n)) {
      return { ok: false, field: f.key, message: `${f.label}은 숫자여야 합니다.` };
    }
    if (n < 0) {
      return { ok: false, field: f.key, message: `${f.label}은 0 이상이어야 합니다.` };
    }
    if (n > f.max) {
      return { ok: false, field: f.key, message: `${f.label}은 ${f.max} 이하여야 합니다.` };
    }
    values[f.key] = n;
  }
  return { ok: true, values: values as Record<FoodMacroKey, number> };
}

adminRouter.get('/admin/foods', async (req, res) => {
  const { page, size, skip } = paginate(req.query);
  const query = String(req.query.query ?? '').trim();
  const status = String(req.query.status ?? 'all');
  const includeInactive = req.query.includeInactive === 'true' || req.query.includeInactive === '1';
  const categoryFilter = validateCategory(req.query.category);
  if (categoryFilter.error) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, categoryFilter.error);
    return;
  }

  const where: Prisma.FoodTemplateWhereInput = {
    ...(includeInactive ? {} : { active: true }),
    ...(query ? { name: { contains: query, mode: 'insensitive' } } : {}),
    ...(status === 'active' ? { active: true } : {}),
    ...(status === 'inactive' ? { active: false } : {}),
    ...(categoryFilter.value ? { category: categoryFilter.value } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.foodTemplate.count({ where }),
    prisma.foodTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: size,
    }),
  ]);

  res.json({
    page,
    size,
    total,
    items: rows.map(serializeFood),
  });
});

adminRouter.get('/admin/foods/:id', async (req, res) => {
  const id = req.params.id;
  const food = await prisma.foodTemplate.findUnique({ where: { id } });
  if (!food) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '음식을 찾을 수 없습니다.');
    return;
  }
  res.json(serializeFood(food));
});

adminRouter.post('/admin/foods', async (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const name = String((b.name as string | undefined) ?? '').trim();
  if (!name) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, '이름이 필요합니다.');
    return;
  }
  const category = validateCategory(b.category);
  if (category.error) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, category.error);
    return;
  }
  const refAmt = validateReferenceAmount(b);
  if (!refAmt.ok) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, refAmt.message, { field: 'referenceAmount' });
    return;
  }
  const pu = resolvePortionUnit(b.portionUnit);
  if (!pu.ok) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, pu.message, { field: pu.field });
    return;
  }
  const plRaw = normalizePortionLabel(b.portionLabel);
  const pl = validatePortionLabelForUnit(pu.unit, plRaw);
  if (!pl.ok) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, pl.message, { field: pl.field });
    return;
  }
  const servingGramsResolved =
    pu.unit === 'GRAM'
      ? { ok: true as const, value: refAmt.value }
      : validateServingGramsField(b.servingGrams);
  if (!servingGramsResolved.ok) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, servingGramsResolved.message, { field: 'servingGrams' });
    return;
  }
  const macros = validateFoodMacros(b);
  if (!macros.ok) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, macros.message, { field: macros.field });
    return;
  }
  const memoRaw = b.memo;
  const f = await prisma.foodTemplate.create({
    data: {
      name,
      memo: memoRaw ? String(memoRaw) : null,
      category: category.value,
      portionUnit: pu.unit as PortionUnit,
      portionLabel: pl.value,
      referenceAmount: refAmt.value,
      servingGrams: servingGramsResolved.value,
      calories: macros.values.calories,
      protein: macros.values.protein,
      fat: macros.values.fat,
      carbohydrate: macros.values.carbohydrate,
    } as Parameters<typeof prisma.foodTemplate.create>[0]['data'],
  });
  res.status(201).json({ id: f.id });
});

adminRouter.put('/admin/foods/:id', async (req, res) => {
  const id = req.params.id;
  const b = (req.body ?? {}) as Record<string, unknown>;
  const existing = await prisma.foodTemplate.findUnique({ where: { id } });
  if (!existing) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '음식을 찾을 수 없습니다.');
    return;
  }
  let categoryUpdate: { category: string | null } | Record<string, never> = {};
  if (b.category !== undefined) {
    const category = validateCategory(b.category);
    if (category.error) {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, category.error);
      return;
    }
    categoryUpdate = { category: category.value };
  }
  // 수정도 기준·영양값을 모두 요구한다(부분 갱신 없음).
  const refAmt = validateReferenceAmount(b);
  if (!refAmt.ok) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, refAmt.message, { field: 'referenceAmount' });
    return;
  }
  const pu = resolvePortionUnit(b.portionUnit);
  if (!pu.ok) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, pu.message, { field: pu.field });
    return;
  }
  const plRaw = normalizePortionLabel(b.portionLabel);
  const pl = validatePortionLabelForUnit(pu.unit, plRaw);
  if (!pl.ok) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, pl.message, { field: pl.field });
    return;
  }
  const servingGramsResolved =
    pu.unit === 'GRAM'
      ? { ok: true as const, value: refAmt.value }
      : validateServingGramsField(b.servingGrams);
  if (!servingGramsResolved.ok) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, servingGramsResolved.message, { field: 'servingGrams' });
    return;
  }
  const macros = validateFoodMacros(b);
  if (!macros.ok) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, macros.message, { field: macros.field });
    return;
  }
  await prisma.foodTemplate.update({
    where: { id },
    data: {
      ...(b.name !== undefined ? { name: String(b.name).trim() } : {}),
      ...(b.memo !== undefined ? { memo: b.memo ? String(b.memo) : null } : {}),
      ...categoryUpdate,
      portionUnit: pu.unit as PortionUnit,
      portionLabel: pl.value,
      referenceAmount: refAmt.value,
      servingGrams: servingGramsResolved.value,
      calories: macros.values.calories,
      protein: macros.values.protein,
      fat: macros.values.fat,
      carbohydrate: macros.values.carbohydrate,
    } as Parameters<typeof prisma.foodTemplate.update>[0]['data'],
  });
  res.json({ ok: true });
});

adminRouter.patch('/admin/foods/:id/deactivate', async (req, res) => {
  const id = req.params.id;
  const existing = await prisma.foodTemplate.findUnique({ where: { id } });
  if (!existing) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '음식을 찾을 수 없습니다.');
    return;
  }
  await prisma.foodTemplate.update({ where: { id }, data: softDeactivateFields() });
  res.json({ ok: true });
});

adminRouter.patch('/admin/foods/:id/activate', async (req, res) => {
  const id = req.params.id;
  const existing = await prisma.foodTemplate.findUnique({ where: { id } });
  if (!existing) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '음식을 찾을 수 없습니다.');
    return;
  }
  await prisma.foodTemplate.update({ where: { id }, data: softActivateFields() });
  res.json({ ok: true });
});

type InquiryRow = {
  id: string;
  userId: string | null;
  subject: string;
  body: string;
  status: string;
  active: boolean;
  answer: string | null;
  answeredAt: Date | null;
  answeredBy: string | null;
  createdAt: Date;
};

function serializeInquirySummary(i: InquiryRow) {
  return {
    id: i.id,
    subject: i.subject,
    status: i.status,
    active: i.active,
    answered: i.answer !== null,
    createdAt: i.createdAt.toISOString(),
  };
}

function serializeInquiryDetail(i: InquiryRow) {
  return {
    id: i.id,
    userId: i.userId,
    subject: i.subject,
    body: i.body,
    status: i.status,
    active: i.active,
    answer: i.answer,
    answeredAt: i.answeredAt?.toISOString() ?? null,
    answeredBy: i.answeredBy,
    createdAt: i.createdAt.toISOString(),
  };
}

adminRouter.get('/admin/inquiries', async (req, res) => {
  const { page, size, skip } = paginate(req.query);
  const query = String(req.query.query ?? '').trim();
  const status = String(req.query.status ?? 'all');
  const includeInactive = req.query.includeInactive === 'true' || req.query.includeInactive === '1';
  const range = parseDateRange(req.query);
  if (rejectInvalidRange(res, range)) return;
  const createdAtFilter = dateRangeFilter(range);

  const where: Prisma.InquiryWhereInput = {
    ...(includeInactive ? {} : { active: true }),
    ...(query
      ? {
          OR: [
            { subject: { contains: query, mode: 'insensitive' } },
            { body: { contains: query, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(status === 'inactive' ? { active: false } : {}),
    ...(status === 'pending' ? { status: 'pending', active: true } : {}),
    ...(status === 'in_progress' ? { status: 'in_progress', active: true } : {}),
    ...(status === 'done' ? { status: 'done', active: true } : {}),
    ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.inquiry.count({ where }),
    prisma.inquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: size,
    }),
  ]);

  res.json({
    page,
    size,
    total,
    items: rows.map(serializeInquirySummary),
  });
});

adminRouter.get('/admin/inquiries/:id', async (req, res) => {
  const id = req.params.id;
  const inquiry = await prisma.inquiry.findUnique({ where: { id } });
  if (!inquiry) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '문의를 찾을 수 없습니다.');
    return;
  }
  res.json(serializeInquiryDetail(inquiry));
});

adminRouter.patch('/admin/inquiries/:id/status', async (req, res) => {
  const id = req.params.id;
  const raw = (req.body as { status?: unknown })?.status;
  if (!isInquiryStatus(raw)) {
    sendError(
      res,
      422,
      ErrorCodes.VALIDATION_FAILED,
      `status는 ${INQUIRY_STATUSES.join(' | ')} 중 하나여야 합니다.`,
      { allowed: [...INQUIRY_STATUSES] },
    );
    return;
  }
  const existing = await prisma.inquiry.findUnique({ where: { id } });
  if (!existing) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '문의를 찾을 수 없습니다.');
    return;
  }
  await prisma.inquiry.update({ where: { id }, data: { status: raw } });
  res.json({ ok: true });
});

adminRouter.patch('/admin/inquiries/:id/answer', async (req, res) => {
  const id = req.params.id;
  const b = (req.body ?? {}) as { answer?: unknown };
  const answerRaw = typeof b.answer === 'string' ? b.answer : '';
  const answer = answerRaw.trim();
  if (!answer) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'answer가 필요합니다.');
    return;
  }
  if (answer.length > ANSWER_MAX_LEN) {
    sendError(
      res,
      422,
      ErrorCodes.VALIDATION_FAILED,
      `answer는 ${ANSWER_MAX_LEN}자 이하여야 합니다.`,
      { maxLength: ANSWER_MAX_LEN },
    );
    return;
  }
  const existing = await prisma.inquiry.findUnique({ where: { id } });
  if (!existing) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '문의를 찾을 수 없습니다.');
    return;
  }
  // 답변 등록 시 항상 완료로 전환한다. transitionToDone 분기는 폐기(과거 호환을 위해 무시).
  const updated = await prisma.inquiry.update({
    where: { id },
    data: {
      answer,
      answeredAt: new Date(),
      answeredBy: adminUserId(req),
      status: 'done' as InquiryStatus,
    },
  });
  res.json(serializeInquiryDetail(updated));
});

adminRouter.patch('/admin/inquiries/:id/deactivate', async (req, res) => {
  const id = req.params.id;
  const existing = await prisma.inquiry.findUnique({ where: { id } });
  if (!existing) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '문의를 찾을 수 없습니다.');
    return;
  }
  await prisma.inquiry.update({ where: { id }, data: softDeactivateFields() });
  res.json({ ok: true });
});

type NoticeRow = {
  id: string;
  title: string;
  body: string;
  active: boolean;
  pinned: boolean;
  publishStart: Date | null;
  publishEnd: Date | null;
  createdAt: Date;
};

function serializeNoticeSummary(n: NoticeRow) {
  return {
    id: n.id,
    title: n.title,
    active: n.active,
    pinned: n.pinned,
    publishStart: n.publishStart?.toISOString() ?? null,
    publishEnd: n.publishEnd?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}

function serializeNoticeDetail(n: NoticeRow) {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    active: n.active,
    pinned: n.pinned,
    publishStart: n.publishStart?.toISOString() ?? null,
    publishEnd: n.publishEnd?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}

type NoticeWindowInput = {
  pinned?: unknown;
  publishStart?: unknown;
  publishEnd?: unknown;
};

type NoticeWindowResult = {
  ok: true;
  pinned?: boolean;
  publishStart?: Date | null;
  publishEnd?: Date | null;
} | {
  ok: false;
  message: string;
};

/**
 * 공지의 pinned/publishStart/publishEnd 입력을 정규화한다.
 * - 빈 문자열/null은 명시적 null 의도(필드 클리어).
 * - undefined는 변경 없음(키 미포함).
 * - 둘 다 채워졌을 때만 start <= end 검증.
 */
function parseNoticeWindow(b: NoticeWindowInput): NoticeWindowResult {
  const out: { pinned?: boolean; publishStart?: Date | null; publishEnd?: Date | null } = {};

  if (b.pinned !== undefined) {
    out.pinned = b.pinned === true || b.pinned === 'true';
  }

  function parseField(raw: unknown, label: string): { skip: true } | { skip: false; value: Date | null } | { error: string } {
    if (raw === undefined) return { skip: true };
    if (raw === null || raw === '') return { skip: false, value: null };
    if (typeof raw !== 'string') return { error: `${label}은 ISO 8601 문자열 또는 null이어야 합니다.` };
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return { error: `${label}은 ISO 8601 형식이어야 합니다.` };
    return { skip: false, value: d };
  }

  const startParsed = parseField(b.publishStart, 'publishStart');
  if ('error' in startParsed) return { ok: false, message: startParsed.error };
  if (!startParsed.skip) out.publishStart = startParsed.value;

  const endParsed = parseField(b.publishEnd, 'publishEnd');
  if ('error' in endParsed) return { ok: false, message: endParsed.error };
  if (!endParsed.skip) out.publishEnd = endParsed.value;

  if (out.publishStart && out.publishEnd && out.publishStart.getTime() > out.publishEnd.getTime()) {
    return { ok: false, message: 'publishStart는 publishEnd보다 이후일 수 없습니다.' };
  }

  return { ok: true, ...out };
}

adminRouter.get('/admin/notices', async (req, res) => {
  const { page, size, skip } = paginate(req.query);
  const query = String(req.query.query ?? '').trim();
  const status = String(req.query.status ?? 'all');
  const includeInactive = req.query.includeInactive === 'true' || req.query.includeInactive === '1';
  const range = parseDateRange(req.query);
  if (rejectInvalidRange(res, range)) return;
  const createdAtFilter = dateRangeFilter(range);

  const where: Prisma.NoticeWhereInput = {
    ...(includeInactive ? {} : { active: true }),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { body: { contains: query, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(status === 'active' ? { active: true } : {}),
    ...(status === 'inactive' ? { active: false } : {}),
    ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.notice.count({ where }),
    prisma.notice.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: size,
    }),
  ]);

  res.json({
    page,
    size,
    total,
    items: rows.map(serializeNoticeSummary),
  });
});

adminRouter.get('/admin/notices/:id', async (req, res) => {
  const id = req.params.id;
  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '공지를 찾을 수 없습니다.');
    return;
  }
  res.json(serializeNoticeDetail(notice));
});

adminRouter.post('/admin/notices', async (req, res) => {
  const b = (req.body ?? {}) as {
    title?: string;
    body?: string;
    pinned?: unknown;
    publishStart?: unknown;
    publishEnd?: unknown;
  };
  const title = String(b.title ?? '').trim();
  if (!title) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, '제목이 필요합니다.');
    return;
  }
  const window = parseNoticeWindow(b);
  if (!window.ok) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, window.message);
    return;
  }
  const n = await prisma.notice.create({
    data: {
      title,
      body: String(b.body ?? ''),
      pinned: window.pinned ?? false,
      publishStart: window.publishStart ?? null,
      publishEnd: window.publishEnd ?? null,
    },
  });
  res.status(201).json({ id: n.id });
});

adminRouter.put('/admin/notices/:id', async (req, res) => {
  const id = req.params.id;
  const b = (req.body ?? {}) as {
    title?: string;
    body?: string;
    pinned?: unknown;
    publishStart?: unknown;
    publishEnd?: unknown;
  };
  const existing = await prisma.notice.findUnique({ where: { id } });
  if (!existing) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '공지를 찾을 수 없습니다.');
    return;
  }
  const window = parseNoticeWindow(b);
  if (!window.ok) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, window.message);
    return;
  }
  // 부분 업데이트: 시작·종료 한쪽만 들어와도 다른 쪽은 기존값과 비교해 정합성 재확인.
  const nextStart = window.publishStart !== undefined ? window.publishStart : existing.publishStart;
  const nextEnd = window.publishEnd !== undefined ? window.publishEnd : existing.publishEnd;
  if (nextStart && nextEnd && nextStart.getTime() > nextEnd.getTime()) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'publishStart는 publishEnd보다 이후일 수 없습니다.');
    return;
  }
  await prisma.notice.update({
    where: { id },
    data: {
      ...(b.title !== undefined ? { title: String(b.title).trim() } : {}),
      ...(b.body !== undefined ? { body: String(b.body) } : {}),
      ...(window.pinned !== undefined ? { pinned: window.pinned } : {}),
      ...(window.publishStart !== undefined ? { publishStart: window.publishStart } : {}),
      ...(window.publishEnd !== undefined ? { publishEnd: window.publishEnd } : {}),
    },
  });
  res.json({ ok: true });
});

adminRouter.patch('/admin/notices/:id/deactivate', async (req, res) => {
  const id = req.params.id;
  const existing = await prisma.notice.findUnique({ where: { id } });
  if (!existing) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '공지를 찾을 수 없습니다.');
    return;
  }
  await prisma.notice.update({ where: { id }, data: softDeactivateFields() });
  res.json({ ok: true });
});

adminRouter.patch('/admin/notices/:id/activate', async (req, res) => {
  const id = req.params.id;
  const existing = await prisma.notice.findUnique({ where: { id } });
  if (!existing) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '공지를 찾을 수 없습니다.');
    return;
  }
  await prisma.notice.update({ where: { id }, data: softActivateFields() });
  res.json({ ok: true });
});

adminRouter.post('/admin/jobs/purge-inactive', async (_req, res) => {
  try {
    const result = await runPurgeInactive(prisma);
    res.status(202).json({ accepted: true, ...result });
  } catch (e) {
    const traceId = (_req as Request & { traceId?: string }).traceId;
    console.error('[purge-inactive]', traceId, e);
    sendError(res, 500, ErrorCodes.INTERNAL_SERVER_ERROR, '비활성 데이터 영구 삭제 작업에 실패했습니다.', {
      traceId,
    });
  }
});

const POLICY_KINDS = ['terms', 'privacy'] as const;
type PolicyKind = (typeof POLICY_KINDS)[number];
const POLICY_BODY_MAX_LEN = 50_000;

function isPolicyKind(v: unknown): v is PolicyKind {
  return typeof v === 'string' && (POLICY_KINDS as readonly string[]).includes(v);
}

function serializePolicy(p: {
  id: string;
  kind: string;
  body: string;
  version: number;
  publishedAt: Date | null;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    kind: p.kind,
    body: p.body,
    version: p.version,
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    updatedAt: p.updatedAt.toISOString(),
  };
}

adminRouter.get('/admin/policies/:kind', async (req, res) => {
  const kind = req.params.kind;
  if (!isPolicyKind(kind)) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, `kind는 ${POLICY_KINDS.join(' | ')} 중 하나여야 합니다.`, {
      allowed: [...POLICY_KINDS],
    });
    return;
  }
  const existing = await prisma.policyDocument.findUnique({ where: { kind } });
  if (!existing) {
    res.json({
      id: null,
      kind,
      body: '',
      version: 0,
      publishedAt: null,
      updatedAt: null,
    });
    return;
  }
  res.json(serializePolicy(existing));
});

adminRouter.put('/admin/policies/:kind', async (req, res) => {
  const kind = req.params.kind;
  if (!isPolicyKind(kind)) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, `kind는 ${POLICY_KINDS.join(' | ')} 중 하나여야 합니다.`, {
      allowed: [...POLICY_KINDS],
    });
    return;
  }
  const b = (req.body ?? {}) as { body?: unknown; publish?: unknown };
  const bodyRaw = typeof b.body === 'string' ? b.body : '';
  if (!bodyRaw.trim()) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'body가 필요합니다.');
    return;
  }
  if (bodyRaw.length > POLICY_BODY_MAX_LEN) {
    sendError(
      res,
      422,
      ErrorCodes.VALIDATION_FAILED,
      `body는 ${POLICY_BODY_MAX_LEN}자 이하여야 합니다.`,
      { maxLength: POLICY_BODY_MAX_LEN },
    );
    return;
  }
  const publish = b.publish === true || b.publish === 'true';

  const now = new Date();
  const existing = await prisma.policyDocument.findUnique({ where: { kind } });
  if (!existing) {
    const created = await prisma.policyDocument.create({
      data: {
        kind,
        body: bodyRaw,
        version: 1,
        publishedAt: publish ? now : null,
      },
    });
    res.status(201).json(serializePolicy(created));
    return;
  }
  const updated = await prisma.policyDocument.update({
    where: { kind },
    data: {
      body: bodyRaw,
      version: { increment: 1 },
      publishedAt: publish ? now : null,
    },
  });
  res.json(serializePolicy(updated));
});
