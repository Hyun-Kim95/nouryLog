import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { sendError, ErrorCodes } from '../lib/errors.js';
import { OCR_FREE_LIMIT, STATS_STALE_HOURS } from '../lib/config.js';
import { detectNutrition } from '../services/ocrService.js';
import { calculateRecommendationFull } from '../lib/recommendation.js';

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
  const full = calculateRecommendationFull({
    gender: p.gender,
    age: p.age,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    activityLevel: p.activityLevel,
    goal: p.goal,
  });
  res.json({
    gender: p.gender,
    age: p.age,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    activityLevel: p.activityLevel ?? null,
    goal: p.goal ?? null,
    proteinGoalG: p.proteinGoalG ?? undefined,
    calorieGoalKcal: p.calorieGoalKcal ?? undefined,
    recommendationVersion: full.recommendationVersion,
    policy: full.policy,
    warnings: full.warnings,
  });
});

const ALLOWED_GENDERS = ['male', 'female', 'unspecified'] as const;
const ALLOWED_ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active'] as const;
const ALLOWED_GOALS = ['lose', 'maintain', 'gain'] as const;
const AGE_MIN = 13;
const AGE_MAX = 99;
const HEIGHT_MIN = 100;
const HEIGHT_MAX = 250;
const WEIGHT_MIN = 20;
const WEIGHT_MAX = 300;
const GOAL_MIN = 0;
const GOAL_MAX = 10000;

type ProfileFieldError = {
  field:
    | 'gender'
    | 'age'
    | 'heightCm'
    | 'weightKg'
    | 'activityLevel'
    | 'goal'
    | 'proteinGoalG'
    | 'calorieGoalKcal';
  message: string;
  details: Record<string, unknown>;
};

function validateEnum<T extends string>(
  field: ProfileFieldError['field'],
  input: unknown,
  allowed: readonly T[],
  label: string,
  options?: { nullable?: boolean },
): { value?: T | null; error?: ProfileFieldError } {
  if (input === undefined) return {};
  if (input === null) {
    if (options?.nullable) return { value: null };
    return {
      error: {
        field,
        message: `${label}은(는) ${allowed.join(', ')} 중 하나여야 합니다.`,
        details: { field, allowed: [...allowed] },
      },
    };
  }
  if (typeof input !== 'string' || !(allowed as readonly string[]).includes(input)) {
    return {
      error: {
        field,
        message: `${label}은(는) ${allowed.join(', ')} 중 하나여야 합니다.`,
        details: { field, allowed: [...allowed] },
      },
    };
  }
  return { value: input as T };
}

function validateGender(input: unknown): { value?: string; error?: ProfileFieldError } {
  const r = validateEnum('gender', input, ALLOWED_GENDERS, 'gender');
  if (r.error) return { error: r.error };
  if (r.value == null) return {};
  return { value: r.value };
}

function validateIntegerRange(
  field: 'age' | 'heightCm' | 'weightKg' | 'proteinGoalG' | 'calorieGoalKcal',
  input: unknown,
  min: number,
  max: number,
  label: string,
): { value?: number; error?: ProfileFieldError } {
  if (input === undefined || input === null || input === '') return {};
  const n = typeof input === 'number' ? input : Number(input);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return {
      error: {
        field,
        message: `${label}은(는) 정수만 입력할 수 있습니다.`,
        details: { field, allowedMin: min, allowedMax: max },
      },
    };
  }
  if (n < min || n > max) {
    return {
      error: {
        field,
        message: `${label}은(는) ${min}~${max} 범위로 입력해 주세요.`,
        details: { field, allowedMin: min, allowedMax: max },
      },
    };
  }
  return { value: n };
}

meRouter.put('/me/profile', async (req, res) => {
  const userId = req.auth!.userId;
  if (req.auth!.role !== 'USER') {
    sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '일반 사용자만 수정할 수 있습니다.');
    return;
  }
  const b = (req.body ?? {}) as Partial<{
    gender: string;
    age: number;
    heightCm: number;
    weightKg: number;
    activityLevel: string;
    goal: string;
    proteinGoalG: number;
    calorieGoalKcal: number;
  }>;

  const gender = validateGender(b.gender);
  if (gender.error) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, gender.error.message, gender.error.details);
    return;
  }
  const activity = validateEnum(
    'activityLevel',
    b.activityLevel,
    ALLOWED_ACTIVITY_LEVELS,
    'activityLevel',
    { nullable: true },
  );
  if (activity.error) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, activity.error.message, activity.error.details);
    return;
  }
  const goal = validateEnum('goal', b.goal, ALLOWED_GOALS, 'goal', { nullable: true });
  if (goal.error) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, goal.error.message, goal.error.details);
    return;
  }
  const age = validateIntegerRange('age', b.age, AGE_MIN, AGE_MAX, '나이');
  if (age.error) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, age.error.message, age.error.details);
    return;
  }
  const height = validateIntegerRange('heightCm', b.heightCm, HEIGHT_MIN, HEIGHT_MAX, '신장');
  if (height.error) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, height.error.message, height.error.details);
    return;
  }
  const weight = validateIntegerRange('weightKg', b.weightKg, WEIGHT_MIN, WEIGHT_MAX, '체중');
  if (weight.error) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, weight.error.message, weight.error.details);
    return;
  }
  const protein = validateIntegerRange('proteinGoalG', b.proteinGoalG, GOAL_MIN, GOAL_MAX, '단백질 목표');
  if (protein.error) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, protein.error.message, protein.error.details);
    return;
  }
  const calorie = validateIntegerRange('calorieGoalKcal', b.calorieGoalKcal, GOAL_MIN, GOAL_MAX, '칼로리 목표');
  if (calorie.error) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, calorie.error.message, calorie.error.details);
    return;
  }

  await prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      gender: gender.value ?? 'unspecified',
      age: age.value ?? 30,
      heightCm: height.value ?? 170,
      weightKg: weight.value ?? 70,
      activityLevel: activity.value ?? null,
      goal: goal.value ?? null,
      proteinGoalG: protein.value,
      calorieGoalKcal: calorie.value,
    },
    update: {
      ...(gender.value !== undefined ? { gender: gender.value } : {}),
      ...(age.value !== undefined ? { age: age.value } : {}),
      ...(height.value !== undefined ? { heightCm: height.value } : {}),
      ...(weight.value !== undefined ? { weightKg: weight.value } : {}),
      ...(activity.value !== undefined ? { activityLevel: activity.value } : {}),
      ...(goal.value !== undefined ? { goal: goal.value } : {}),
      ...(protein.value !== undefined ? { proteinGoalG: protein.value } : {}),
      ...(calorie.value !== undefined ? { calorieGoalKcal: calorie.value } : {}),
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
  if (!p) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '프로필이 없습니다.');
    return;
  }
  const full = calculateRecommendationFull({
    gender: p.gender,
    age: p.age,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    activityLevel: p.activityLevel,
    goal: p.goal,
  });
  await prisma.profile.update({
    where: { userId },
    data: { proteinGoalG: full.proteinGoalG, calorieGoalKcal: full.calorieGoalKcal },
  });
  res.json({
    proteinGoalG: full.proteinGoalG,
    calorieGoalKcal: full.calorieGoalKcal,
    recommendationVersion: full.recommendationVersion,
    policy: full.policy,
    warnings: full.warnings,
  });
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
