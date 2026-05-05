import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { sendError, ErrorCodes } from '../lib/errors.js';
import { OCR_FREE_LIMIT, STATS_STALE_HOURS } from '../lib/config.js';
import { detectNutrition } from '../services/ocrService.js';

export const meRouter = Router();
meRouter.use(requireAuth);

function rangeFrom(range: string): Date {
  const now = new Date();
  const from = new Date(now);
  if (range === 'meal') {
    from.setTime(now.getTime() - 24 * 60 * 60 * 1000);
    return from;
  }
  if (range === 'day') {
    from.setHours(0, 0, 0, 0);
    return from;
  }
  if (range === 'week') {
    from.setDate(from.getDate() - 7);
    return from;
  }
  if (range === 'month') {
    from.setDate(from.getDate() - 30);
    return from;
  }
  throw new Error('bad_range');
}

meRouter.get('/me/profile', async (req, res) => {
  const userId = req.auth!.userId;
  if (req.auth!.role !== 'USER') {
    sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '앱 프로필은 일반 사용자만 조회할 수 있습니다.');
    return;
  }
  const p = await prisma.profile.findUnique({ where: { userId } });
  if (!p) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '프로필이 없습니다.');
    return;
  }
  res.json({
    gender: p.gender,
    age: p.age,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    proteinGoalG: p.proteinGoalG ?? undefined,
    calorieGoalKcal: p.calorieGoalKcal ?? undefined,
  });
});

meRouter.put('/me/profile', async (req, res) => {
  const userId = req.auth!.userId;
  if (req.auth!.role !== 'USER') {
    sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '일반 사용자만 수정할 수 있습니다.');
    return;
  }
  const b = req.body as Partial<{
    gender: string;
    age: number;
    heightCm: number;
    weightKg: number;
    proteinGoalG: number;
    calorieGoalKcal: number;
  }>;
  await prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      gender: String(b.gender ?? 'unspecified'),
      age: Number(b.age ?? 30),
      heightCm: Number(b.heightCm ?? 170),
      weightKg: Number(b.weightKg ?? 70),
      proteinGoalG: b.proteinGoalG,
      calorieGoalKcal: b.calorieGoalKcal,
    },
    update: {
      ...(b.gender !== undefined ? { gender: String(b.gender) } : {}),
      ...(b.age !== undefined ? { age: Number(b.age) } : {}),
      ...(b.heightCm !== undefined ? { heightCm: Number(b.heightCm) } : {}),
      ...(b.weightKg !== undefined ? { weightKg: Number(b.weightKg) } : {}),
      ...(b.proteinGoalG !== undefined ? { proteinGoalG: Number(b.proteinGoalG) } : {}),
      ...(b.calorieGoalKcal !== undefined ? { calorieGoalKcal: Number(b.calorieGoalKcal) } : {}),
    },
  });
  res.json({ ok: true });
});

meRouter.post('/me/recommendation/recalculate', async (req, res) => {
  const userId = req.auth!.userId;
  if (req.auth!.role !== 'USER') {
    sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '일반 사용자만 사용할 수 있습니다.');
    return;
  }
  const p = await prisma.profile.findUnique({ where: { userId } });
  const w = p?.weightKg ?? 70;
  const proteinGoalG = Math.round(w * 1.6);
  const calorieGoalKcal = Math.round(w * 30);
  await prisma.profile.update({
    where: { userId },
    data: { proteinGoalG, calorieGoalKcal },
  });
  res.json({ proteinGoalG, calorieGoalKcal });
});

meRouter.post('/meals', async (req, res) => {
  const userId = req.auth!.userId;
  if (req.auth!.role !== 'USER') {
    sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '일반 사용자만 기록할 수 있습니다.');
    return;
  }
  const b = req.body as Partial<{
    name: string;
    consumedAt: string;
    grams: number;
    calories: number;
    carbohydrate: number;
    protein: number;
    fat: number;
    note: string;
    imageUrl: string;
  }>;
  const name = String(b.name ?? '').trim();
  if (!name) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, '음식명이 필요합니다.');
    return;
  }
  const consumedAt = b.consumedAt ? new Date(b.consumedAt) : new Date();
  const meal = await prisma.meal.create({
    data: {
      userId,
      name,
      consumedAt,
      grams: Number(b.grams ?? 100),
      calories: Number(b.calories ?? 0),
      carbohydrate: Number(b.carbohydrate ?? 0),
      protein: Number(b.protein ?? 0),
      fat: Number(b.fat ?? 0),
      note: b.note ? String(b.note) : null,
      imageUrl: b.imageUrl ? String(b.imageUrl) : null,
    },
  });
  res.status(201).json({ mealId: meal.id });
});

meRouter.get('/meals', async (req, res) => {
  const userId = req.auth!.userId;
  if (req.auth!.role !== 'USER') {
    sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '일반 사용자만 조회할 수 있습니다.');
    return;
  }
  const page = Math.max(1, Number(req.query.page ?? 1));
  const size = Math.min(100, Math.max(1, Number(req.query.size ?? 15)));
  const where = { userId, active: true };
  const [total, items] = await Promise.all([
    prisma.meal.count({ where }),
    prisma.meal.findMany({
      where,
      orderBy: { consumedAt: 'desc' },
      skip: (page - 1) * size,
      take: size,
      select: {
        id: true,
        note: true,
        consumedAt: true,
        name: true,
        grams: true,
        calories: true,
        carbohydrate: true,
        protein: true,
        fat: true,
        imageUrl: true,
      },
    }),
  ]);
  res.json({
    page,
    size,
    total,
    items: items.map((m) => ({
      mealId: m.id,
      note: m.note,
      consumedAt: m.consumedAt.toISOString(),
      name: m.name,
      grams: m.grams,
      calories: m.calories,
      carbohydrate: m.carbohydrate,
      protein: m.protein,
      fat: m.fat,
      imageUrl: m.imageUrl,
    })),
  });
});

meRouter.put('/meals/:mealId', async (req, res) => {
  const userId = req.auth!.userId;
  if (req.auth!.role !== 'USER') {
    sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '일반 사용자만 수정할 수 있습니다.');
    return;
  }
  const mealId = req.params.mealId;
  const meal = await prisma.meal.findFirst({ where: { id: mealId, userId, active: true } });
  if (!meal) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '기록을 찾을 수 없습니다.');
    return;
  }
  const b = req.body as Partial<{
    name: string;
    consumedAt: string;
    grams: number;
    calories: number;
    carbohydrate: number;
    protein: number;
    fat: number;
    note: string;
    imageUrl: string;
  }>;
  await prisma.meal.update({
    where: { id: mealId },
    data: {
      ...(b.name !== undefined ? { name: String(b.name) } : {}),
      ...(b.consumedAt !== undefined ? { consumedAt: new Date(b.consumedAt) } : {}),
      ...(b.grams !== undefined ? { grams: Number(b.grams) } : {}),
      ...(b.calories !== undefined ? { calories: Number(b.calories) } : {}),
      ...(b.carbohydrate !== undefined ? { carbohydrate: Number(b.carbohydrate) } : {}),
      ...(b.protein !== undefined ? { protein: Number(b.protein) } : {}),
      ...(b.fat !== undefined ? { fat: Number(b.fat) } : {}),
      ...(b.note !== undefined ? { note: b.note ? String(b.note) : null } : {}),
      ...(b.imageUrl !== undefined ? { imageUrl: b.imageUrl ? String(b.imageUrl) : null } : {}),
    },
  });
  res.json({ ok: true });
});

meRouter.patch('/meals/:mealId/deactivate', async (req, res) => {
  const userId = req.auth!.userId;
  if (req.auth!.role !== 'USER') {
    sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '일반 사용자만 비활성화할 수 있습니다.');
    return;
  }
  const mealId = req.params.mealId;
  const meal = await prisma.meal.findFirst({ where: { id: mealId, userId, active: true } });
  if (!meal) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '기록을 찾을 수 없습니다.');
    return;
  }
  await prisma.meal.update({ where: { id: mealId }, data: { active: false } });
  res.json({ ok: true });
});

meRouter.post('/nutrition/ocr', async (req, res) => {
  const userId = req.auth!.userId;
  if (req.auth!.role !== 'USER') {
    sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '일반 사용자만 OCR을 사용할 수 있습니다.');
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { billing: true },
  });
  if (!user) {
    sendError(res, 401, ErrorCodes.AUTH_UNAUTHORIZED, '사용자를 찾을 수 없습니다.');
    return;
  }
  const paid = user.billing?.ocrPaidEnabled ?? false;
  if (!paid && user.freeOcrUsed >= OCR_FREE_LIMIT) {
    sendError(res, 402, ErrorCodes.OCR_FREE_QUOTA_EXCEEDED, '무료 OCR 한도를 초과했습니다.', {
      limit: OCR_FREE_LIMIT,
    });
    return;
  }
  let remainingFreeQuota = OCR_FREE_LIMIT;
  if (!paid) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { freeOcrUsed: { increment: 1 } },
      select: { freeOcrUsed: true },
    });
    remainingFreeQuota = Math.max(0, OCR_FREE_LIMIT - updated.freeOcrUsed);
  }
  const body = req.body as { imageBase64?: string; imageUrl?: string };
  try {
    const parsed = await detectNutrition({
      imageBase64: body.imageBase64,
      imageUrl: body.imageUrl,
    });
    res.json({
      calories: parsed.calories,
      carbohydrate: parsed.carbohydrate,
      protein: parsed.protein,
      fat: parsed.fat,
      confidence: parsed.confidence,
      missingFields: parsed.missingFields,
      remainingFreeQuota,
    });
    return;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'ocr_provider_unavailable';
    if (message.includes('missing_ocr_api_key')) {
      sendError(res, 503, ErrorCodes.OCR_PROVIDER_UNAVAILABLE, 'OCR API 키가 설정되지 않았습니다.');
      return;
    }
    if (message.includes('missing_ocr_image_input')) {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'imageBase64 또는 imageUrl이 필요합니다.');
      return;
    }
    if (message.includes('ocr_rate_limit')) {
      sendError(res, 429, ErrorCodes.OCR_RATE_LIMIT, 'OCR 요청 한도를 초과했습니다.');
      return;
    }
    if (message.includes('ocr_parse_failed')) {
      sendError(res, 422, ErrorCodes.OCR_PARSE_FAILED, 'OCR 결과에서 영양 정보를 파싱하지 못했습니다.');
      return;
    }
    sendError(res, 503, ErrorCodes.OCR_PROVIDER_UNAVAILABLE, 'OCR 제공자 호출에 실패했습니다.');
    return;
  }
});

meRouter.get('/stats', async (req, res) => {
  const userId = req.auth!.userId;
  if (req.auth!.role !== 'USER') {
    sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '일반 사용자만 통계를 조회할 수 있습니다.');
    return;
  }
  const range = String(req.query.range ?? '');
  let from: Date;
  try {
    from = rangeFrom(range);
  } catch {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'range 파라미터가 필요합니다.', { field: 'range' });
    return;
  }
  const batch = await prisma.statsBatch.findUnique({ where: { id: 'singleton' } });
  const aggregatedAt = batch?.lastRunAt ?? new Date();
  const staleMs = Date.now() - aggregatedAt.getTime();
  const staleHours = staleMs / (1000 * 60 * 60);
  const isStale = staleHours > STATS_STALE_HOURS;

  const agg = await prisma.meal.aggregate({
    where: { userId, active: true, consumedAt: { gte: from } },
    _sum: {
      calories: true,
      carbohydrate: true,
      protein: true,
      fat: true,
    },
  });

  res.json({
    aggregatedAt: aggregatedAt.toISOString(),
    isStale,
    staleHours: Math.round(staleHours * 10) / 10,
    timezone: 'Asia/Seoul',
    summary: {
      calories: agg._sum.calories ?? 0,
      carbohydrate: agg._sum.carbohydrate ?? 0,
      protein: agg._sum.protein ?? 0,
      fat: agg._sum.fat ?? 0,
    },
  });
});

meRouter.get('/me/billing/entitlements', async (req, res) => {
  const userId = req.auth!.userId;
  if (req.auth!.role !== 'USER') {
    sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '일반 사용자만 조회할 수 있습니다.');
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { billing: true },
  });
  if (!user) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '사용자 없음');
    return;
  }
  const ocrPaid = user.billing?.ocrPaidEnabled ?? false;
  const adFree = user.billing?.adFreeEnabled ?? false;
  let nextPaywallTrigger: 'none' | 'ocr_remaining_1' | 'ocr_exhausted' = 'none';
  if (!ocrPaid) {
    if (user.freeOcrUsed >= OCR_FREE_LIMIT) nextPaywallTrigger = 'ocr_exhausted';
    else if (user.freeOcrUsed >= OCR_FREE_LIMIT - 1) nextPaywallTrigger = 'ocr_remaining_1';
  }
  res.json({
    ocrQuotaLimit: OCR_FREE_LIMIT,
    ocrQuotaUsed: user.freeOcrUsed,
    ocrPaidEnabled: ocrPaid,
    adFreeEnabled: adFree,
    nextPaywallTrigger,
  });
});

meRouter.post('/me/billing/checkout', async (req, res) => {
  const userId = req.auth!.userId;
  if (req.auth!.role !== 'USER') {
    sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '일반 사용자만 결제할 수 있습니다.');
    return;
  }
  const pt = (req.body as { productType?: string })?.productType;
  if (pt !== 'premium_monthly') {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'productType은 premium_monthly 여야 합니다.');
    return;
  }
  await prisma.billing.upsert({
    where: { userId },
    create: { userId, ocrPaidEnabled: true },
    update: { ocrPaidEnabled: true },
  });
  res.json({ ok: true });
});

meRouter.post('/me/billing/restore', async (_req, res) => {
  res.json({ ok: true });
});

meRouter.get('/me/ads/status', async (req, res) => {
  const userId = req.auth!.userId;
  if (req.auth!.role !== 'USER') {
    sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '일반 사용자만 조회할 수 있습니다.');
    return;
  }
  const b = await prisma.billing.findUnique({ where: { userId } });
  const adFree = b?.adFreeEnabled ?? false;
  res.json({
    showBottomBanner: !adFree,
    reason: adFree ? 'ad_free_purchased' : 'default_free',
  });
});
