import { Router, type Request, type Response } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middleware/requireAuth.js';
import { sendError, ErrorCodes } from '../lib/errors.js';

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
    })),
  });
});

adminRouter.patch('/admin/users/:id/deactivate', async (req, res) => {
  const id = req.params.id;
  const user = await prisma.user.findFirst({ where: { id, role: 'USER' } });
  if (!user) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '회원을 찾을 수 없습니다.');
    return;
  }
  await prisma.user.update({
    where: { id },
    data: { active: false, deactivatedAt: new Date() },
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
    data: { active: true, deactivatedAt: null },
  });
  res.json({ ok: true });
});

function serializeFood(f: {
  id: string;
  name: string;
  memo: string | null;
  category: string | null;
  active: boolean;
  createdAt: Date;
}) {
  return {
    id: f.id,
    name: f.name,
    memo: f.memo,
    category: f.category,
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
  const b = req.body as { name?: string; memo?: string; category?: string };
  const name = String(b.name ?? '').trim();
  if (!name) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, '이름이 필요합니다.');
    return;
  }
  const category = validateCategory(b.category);
  if (category.error) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, category.error);
    return;
  }
  const f = await prisma.foodTemplate.create({
    data: {
      name,
      memo: b.memo ? String(b.memo) : null,
      category: category.value,
    },
  });
  res.status(201).json({ id: f.id });
});

adminRouter.put('/admin/foods/:id', async (req, res) => {
  const id = req.params.id;
  const b = req.body as { name?: string; memo?: string; category?: string | null };
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
  await prisma.foodTemplate.update({
    where: { id },
    data: {
      ...(b.name !== undefined ? { name: String(b.name).trim() } : {}),
      ...(b.memo !== undefined ? { memo: b.memo ? String(b.memo) : null } : {}),
      ...categoryUpdate,
    },
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
  await prisma.foodTemplate.update({ where: { id }, data: { active: false } });
  res.json({ ok: true });
});

adminRouter.patch('/admin/foods/:id/activate', async (req, res) => {
  const id = req.params.id;
  const existing = await prisma.foodTemplate.findUnique({ where: { id } });
  if (!existing) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '음식을 찾을 수 없습니다.');
    return;
  }
  await prisma.foodTemplate.update({ where: { id }, data: { active: true } });
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
  await prisma.inquiry.update({ where: { id }, data: { active: false } });
  res.json({ ok: true });
});

function serializeNoticeSummary(n: {
  id: string;
  title: string;
  body: string;
  active: boolean;
  createdAt: Date;
}) {
  return {
    id: n.id,
    title: n.title,
    active: n.active,
    createdAt: n.createdAt.toISOString(),
  };
}

function serializeNoticeDetail(n: {
  id: string;
  title: string;
  body: string;
  active: boolean;
  createdAt: Date;
}) {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    active: n.active,
    createdAt: n.createdAt.toISOString(),
  };
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
      orderBy: { createdAt: 'desc' },
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
  const b = req.body as { title?: string; body?: string };
  const title = String(b.title ?? '').trim();
  if (!title) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, '제목이 필요합니다.');
    return;
  }
  const n = await prisma.notice.create({
    data: { title, body: String(b.body ?? '') },
  });
  res.status(201).json({ id: n.id });
});

adminRouter.put('/admin/notices/:id', async (req, res) => {
  const id = req.params.id;
  const b = req.body as { title?: string; body?: string };
  const existing = await prisma.notice.findUnique({ where: { id } });
  if (!existing) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '공지를 찾을 수 없습니다.');
    return;
  }
  await prisma.notice.update({
    where: { id },
    data: {
      ...(b.title !== undefined ? { title: String(b.title).trim() } : {}),
      ...(b.body !== undefined ? { body: String(b.body) } : {}),
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
  await prisma.notice.update({ where: { id }, data: { active: false } });
  res.json({ ok: true });
});

adminRouter.patch('/admin/notices/:id/activate', async (req, res) => {
  const id = req.params.id;
  const existing = await prisma.notice.findUnique({ where: { id } });
  if (!existing) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '공지를 찾을 수 없습니다.');
    return;
  }
  await prisma.notice.update({ where: { id }, data: { active: true } });
  res.json({ ok: true });
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
