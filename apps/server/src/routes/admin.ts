import { Router, type Request } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middleware/requireAuth.js';
import { sendError, ErrorCodes } from '../lib/errors.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

function paginate(q: Request['query']) {
  const page = Math.max(1, Number(q.page ?? 1));
  const size = Math.min(100, Math.max(1, Number(q.size ?? 15)));
  return { page, size, skip: (page - 1) * size };
}

adminRouter.get('/admin/dashboard', async (_req, res) => {
  const since7 = new Date();
  since7.setDate(since7.getDate() - 7);
  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);

  const [newUsers, activeUsers, mealRecordCount, inquiryCount] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: since7 }, role: 'USER' } }),
    prisma.user.count({ where: { active: true, role: 'USER' } }),
    prisma.meal.count({ where: { active: true } }),
    prisma.inquiry.count({ where: { active: true, status: { not: 'done' } } }),
  ]);

  res.json({
    newUsers,
    activeUsers,
    mealRecordCount,
    inquiryCount,
  });
});

adminRouter.post('/admin/stats/reaggregate', async (_req, res) => {
  await prisma.statsBatch.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', lastRunAt: new Date() },
    update: { lastRunAt: new Date() },
  });
  res.status(202).json({ accepted: true });
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
      select: { id: true, email: true, active: true, deactivatedAt: true, createdAt: true },
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

adminRouter.get('/admin/foods', async (req, res) => {
  const { page, size, skip } = paginate(req.query);
  const query = String(req.query.query ?? '').trim();
  const status = String(req.query.status ?? 'all');
  const includeInactive = req.query.includeInactive === 'true' || req.query.includeInactive === '1';

  const where: Prisma.FoodTemplateWhereInput = {
    ...(includeInactive ? {} : { active: true }),
    ...(query ? { name: { contains: query } } : {}),
    ...(status === 'active' ? { active: true } : {}),
    ...(status === 'inactive' ? { active: false } : {}),
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
    items: rows.map((f) => ({
      id: f.id,
      name: f.name,
      status: f.active ? 'active' : 'inactive',
      memo: f.memo,
      createdAt: f.createdAt.toISOString(),
    })),
  });
});

adminRouter.post('/admin/foods', async (req, res) => {
  const b = req.body as { name?: string; memo?: string };
  const name = String(b.name ?? '').trim();
  if (!name) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, '이름이 필요합니다.');
    return;
  }
  const f = await prisma.foodTemplate.create({
    data: { name, memo: b.memo ? String(b.memo) : null },
  });
  res.status(201).json({ id: f.id });
});

adminRouter.put('/admin/foods/:id', async (req, res) => {
  const id = req.params.id;
  const b = req.body as { name?: string; memo?: string };
  const existing = await prisma.foodTemplate.findUnique({ where: { id } });
  if (!existing) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '음식을 찾을 수 없습니다.');
    return;
  }
  await prisma.foodTemplate.update({
    where: { id },
    data: {
      ...(b.name !== undefined ? { name: String(b.name) } : {}),
      ...(b.memo !== undefined ? { memo: b.memo ? String(b.memo) : null } : {}),
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

adminRouter.get('/admin/inquiries', async (req, res) => {
  const { page, size, skip } = paginate(req.query);
  const query = String(req.query.query ?? '').trim();
  const status = String(req.query.status ?? 'all');
  const includeInactive = req.query.includeInactive === 'true' || req.query.includeInactive === '1';

  const where: Prisma.InquiryWhereInput = {
    ...(includeInactive ? {} : { active: true }),
    ...(query ? { OR: [{ subject: { contains: query } }, { body: { contains: query } }] } : {}),
    ...(status === 'inactive' ? { active: false } : {}),
    ...(status === 'pending' ? { status: 'pending', active: true } : {}),
    ...(status === 'done' ? { status: 'done', active: true } : {}),
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
    items: rows.map((i) => ({
      id: i.id,
      subject: i.subject,
      status: i.status,
      active: i.active,
      createdAt: i.createdAt.toISOString(),
    })),
  });
});

adminRouter.patch('/admin/inquiries/:id/status', async (req, res) => {
  const id = req.params.id;
  const status = String((req.body as { status?: string })?.status ?? '');
  if (!status) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'status가 필요합니다.');
    return;
  }
  const existing = await prisma.inquiry.findUnique({ where: { id } });
  if (!existing) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '문의를 찾을 수 없습니다.');
    return;
  }
  await prisma.inquiry.update({ where: { id }, data: { status } });
  res.json({ ok: true });
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

adminRouter.get('/admin/notices', async (req, res) => {
  const { page, size, skip } = paginate(req.query);
  const query = String(req.query.query ?? '').trim();
  const status = String(req.query.status ?? 'all');
  const includeInactive = req.query.includeInactive === 'true' || req.query.includeInactive === '1';

  const where: Prisma.NoticeWhereInput = {
    ...(includeInactive ? {} : { active: true }),
    ...(query ? { OR: [{ title: { contains: query } }, { body: { contains: query } }] } : {}),
    ...(status === 'active' ? { active: true } : {}),
    ...(status === 'inactive' ? { active: false } : {}),
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
    items: rows.map((n) => ({
      id: n.id,
      title: n.title,
      active: n.active,
      createdAt: n.createdAt.toISOString(),
    })),
  });
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
      ...(b.title !== undefined ? { title: String(b.title) } : {}),
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
