import { Router, type Response } from 'express';
import { MealInputMode, MealSlot, type Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { resolvedReferenceAmount } from '../lib/foodTemplateReference.js';
import { computeScaledNutritionFromGrams } from '../lib/mealFromTemplate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { sendError, ErrorCodes } from '../lib/errors.js';
import { OCR_FREE_LIMIT, STATS_STALE_HOURS } from '../lib/config.js';
import { detectNutrition } from '../services/ocrService.js';
import {
  calculateRecommendationFull,
  computeGoalRanges,
  resolveProfileGoalRanges,
  safeGoal,
} from '../lib/recommendation.js';
import {
  boundsForRange,
  isPeriodInFuture,
  parseAnchorDate,
  todayAnchorKst,
} from '../lib/statsPeriod.js';

export const meRouter = Router();
meRouter.use(requireAuth);

const PORTION_QTY_MIN = 0.25;
const PORTION_QTY_MAX = 50;
const TOTAL_GRAMS_MIN = 1;
const TOTAL_GRAMS_MAX = 5000;

function paginateFoodTemplates(q: { page?: unknown; size?: unknown }) {
  const page = Math.max(1, Number(q.page ?? 1));
  const size = Math.min(100, Math.max(1, Number(q.size ?? 15)));
  return { page, size, skip: (page - 1) * size };
}

function parseMealInputMode(raw: unknown): MealInputMode | null {
  if (raw === MealInputMode.PORTION_COUNT || raw === MealInputMode.TOTAL_GRAMS) return raw;
  if (raw === 'PORTION_COUNT') return MealInputMode.PORTION_COUNT;
  if (raw === 'TOTAL_GRAMS') return MealInputMode.TOTAL_GRAMS;
  return null;
}

function parseMealSlot(raw: unknown): MealSlot | null | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const s = String(raw).toUpperCase();
  if (s === 'BREAKFAST' || s === 'LUNCH' || s === 'DINNER' || s === 'SNACK') return s as MealSlot;
  return null;
}

function assertNonNegativeNutrition(fields: Record<string, number>, res: Response): boolean {
  for (const [key, val] of Object.entries(fields)) {
    if (!Number.isFinite(val) || val < 0) {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, `${key}는 0 이상이어야 합니다.`, { field: key });
      return false;
    }
  }
  return true;
}

function isTemplateNutritionComplete(t: {
  servingGrams: number | null;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbohydrate: number | null;
}): boolean {
  return (
    t.servingGrams != null &&
    t.servingGrams > 0 &&
    t.calories != null &&
    t.protein != null &&
    t.fat != null &&
    t.carbohydrate != null
  );
}

const REQUIRED_CONSENT_KINDS = ['terms', 'privacy'] as const;
type ConsentKind = (typeof REQUIRED_CONSENT_KINDS)[number];
type ConsentVersions = Record<ConsentKind, number>;

function parseConsentVersions(body: unknown): { versions?: ConsentVersions; message?: string; details?: Record<string, unknown> } {
  const b = body as {
    ageConfirmed?: unknown;
    consents?: Partial<Record<ConsentKind, { version?: unknown }>>;
  };
  if (b.ageConfirmed !== true) {
    return { message: '만 14세 이상 확인이 필요합니다.', details: { field: 'ageConfirmed' } };
  }
  const versions: Partial<ConsentVersions> = {};
  for (const kind of REQUIRED_CONSENT_KINDS) {
    const raw = b.consents?.[kind]?.version;
    const version = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isInteger(version) || version <= 0) {
      return {
        message: '이용약관과 개인정보처리방침 동의 버전이 필요합니다.',
        details: { field: `consents.${kind}.version`, kind },
      };
    }
    versions[kind] = version;
  }
  return { versions: versions as ConsentVersions };
}

function parseConsentSource(input: unknown): string | null {
  if (input === undefined || input === null) return null;
  const source = String(input).trim();
  return source ? source.slice(0, 80) : null;
}

async function validatePublishedConsentVersions(
  client: Prisma.TransactionClient | typeof prisma,
  versions: ConsentVersions,
): Promise<{ ok: true } | { ok: false; message: string; details: Record<string, unknown> }> {
  const docs = await client.policyDocument.findMany({
    where: { kind: { in: [...REQUIRED_CONSENT_KINDS] }, publishedAt: { not: null } },
    select: { kind: true, version: true },
  });
  const byKind = new Map(docs.map((doc) => [doc.kind, doc.version]));
  for (const kind of REQUIRED_CONSENT_KINDS) {
    const current = byKind.get(kind);
    if (!current) return { ok: false, message: '게시된 정책 문서를 찾을 수 없습니다.', details: { kind } };
    if (current !== versions[kind]) {
      return {
        ok: false,
        message: '최신 정책 문서에 다시 동의해 주세요.',
        details: { kind, currentVersion: current, submittedVersion: versions[kind] },
      };
    }
  }
  return { ok: true };
}

async function createMissingConsents(
  client: Prisma.TransactionClient | typeof prisma,
  userId: string,
  versions: ConsentVersions,
  source: string | null,
) {
  for (const kind of REQUIRED_CONSENT_KINDS) {
    const existing = await client.userConsent.findFirst({
      where: { userId, kind, policyVersion: versions[kind] },
      select: { id: true },
    });
    if (existing) continue;
    await client.userConsent.create({ data: { userId, kind, policyVersion: versions[kind], source } });
  }
}

function mealRollingBounds(now = new Date()) {
  const toExclusive = now;
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return { from, toExclusive, anchor: todayAnchorKst(now), label: '최근 24시간' };
}

meRouter.post('/me/consents', async (req, res) => {
  const userId = req.auth!.userId;
  if (req.auth!.role !== 'USER') {
    sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '일반 사용자만 동의 정보를 저장할 수 있습니다.');
    return;
  }

  const consent = parseConsentVersions(req.body);
  if (!consent.versions) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, consent.message ?? '동의 정보가 필요합니다.', consent.details);
    return;
  }

  const source = parseConsentSource((req.body as { source?: unknown })?.source);
  try {
    await prisma.$transaction(async (tx) => {
      const validation = await validatePublishedConsentVersions(tx, consent.versions!);
      if (!validation.ok) {
        throw Object.assign(new Error(validation.message), {
          consentValidation: true,
          details: validation.details,
        });
      }
      await createMissingConsents(tx, userId, consent.versions!, source);
    });
    res.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && 'consentValidation' in e) {
      const detail = e as Error & { details?: Record<string, unknown> };
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, detail.message, detail.details);
      return;
    }
    throw e;
  }
});

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
  const ranges = resolveProfileGoalRanges(p.proteinGoalG, p.calorieGoalKcal, p.goal, p);
  res.json({
    gender: p.gender,
    age: p.age,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    activityLevel: p.activityLevel ?? null,
    goal: p.goal ?? null,
    proteinGoalG: p.proteinGoalG ?? undefined,
    calorieGoalKcal: p.calorieGoalKcal ?? undefined,
    proteinGoalMinG: ranges?.proteinGoalMinG,
    proteinGoalMaxG: ranges?.proteinGoalMaxG,
    calorieGoalMinKcal: ranges?.calorieGoalMinKcal,
    calorieGoalMaxKcal: ranges?.calorieGoalMaxKcal,
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

  const existing = await prisma.profile.findUnique({ where: { userId } });
  const mergedGoal = goal.value !== undefined ? goal.value : (existing?.goal ?? null);
  const mergedProtein = protein.value !== undefined ? protein.value : existing?.proteinGoalG;
  const mergedCalorie = calorie.value !== undefined ? calorie.value : existing?.calorieGoalKcal;

  let rangeData: ReturnType<typeof computeGoalRanges> | undefined;
  if (mergedProtein != null && mergedCalorie != null) {
    rangeData = computeGoalRanges(mergedProtein, mergedCalorie, safeGoal(mergedGoal));
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
      ...(rangeData ?? {}),
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
      ...(rangeData ?? {}),
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
  const ranges = computeGoalRanges(full.proteinGoalG, full.calorieGoalKcal, safeGoal(p.goal));
  await prisma.profile.update({
    where: { userId },
    data: {
      proteinGoalG: full.proteinGoalG,
      calorieGoalKcal: full.calorieGoalKcal,
      ...ranges,
    },
  });
  res.json({
    proteinGoalG: full.proteinGoalG,
    calorieGoalKcal: full.calorieGoalKcal,
    ...ranges,
    recommendationVersion: full.recommendationVersion,
    policy: full.policy,
    warnings: full.warnings,
  });
});

meRouter.get('/me/food-templates', async (req, res) => {
  if (req.auth!.role !== 'USER') {
    sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '일반 사용자만 조회할 수 있습니다.');
    return;
  }
  const { page, size, skip } = paginateFoodTemplates(req.query);
  const query = String(req.query.query ?? '').trim();
  const categoryFilter = String(req.query.category ?? '').trim();

  const where: Prisma.FoodTemplateWhereInput = {
    active: true,
    servingGrams: { gt: 0 },
    calories: { not: null },
    protein: { not: null },
    fat: { not: null },
    carbohydrate: { not: null },
    ...(query ? { name: { contains: query, mode: 'insensitive' } } : {}),
    ...(categoryFilter ? { category: categoryFilter } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.foodTemplate.count({ where }),
    prisma.foodTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
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
      memo: f.memo,
      category: f.category,
      portionUnit: f.portionUnit,
      portionLabel: f.portionLabel,
      referenceAmount: resolvedReferenceAmount(f as { referenceAmount?: number | null; portionUnit: string; servingGrams: number | null }),
      servingGrams: f.servingGrams!,
      calories: f.calories!,
      protein: f.protein!,
      fat: f.fat!,
      carbohydrate: f.carbohydrate!,
    })),
  });
});

meRouter.post('/meals', async (req, res) => {
  const userId = req.auth!.userId;
  if (req.auth!.role !== 'USER') {
    sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '일반 사용자만 기록할 수 있습니다.');
    return;
  }
  const b = req.body as Record<string, unknown>;
  const consumedAt = b.consumedAt ? new Date(String(b.consumedAt)) : new Date();
  const slotParsed = parseMealSlot(b.mealSlot);
  if (b.mealSlot != null && b.mealSlot !== '' && slotParsed === null) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'mealSlot이 올바르지 않습니다.', { field: 'mealSlot' });
    return;
  }
  const mealSlot = slotParsed ?? null;

  const rawTplId = b.foodTemplateId;
  const templateId = typeof rawTplId === 'string' && rawTplId.trim() ? rawTplId.trim() : null;

  if (templateId) {
    const mode = parseMealInputMode(b.mealInputMode);
    if (!mode) {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'mealInputMode가 필요합니다.', { field: 'mealInputMode' });
      return;
    }
    const template = await prisma.foodTemplate.findFirst({
      where: { id: templateId, active: true },
    });
    if (!template || !isTemplateNutritionComplete(template)) {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, '템플릿을 사용할 수 없습니다.', { field: 'foodTemplateId' });
      return;
    }

    let userTotalGrams: number;
    let portionQuantity: number | null = null;
    if (mode === MealInputMode.PORTION_COUNT) {
      const qRaw = b.portionQuantity;
      const q = typeof qRaw === 'number' ? qRaw : Number(qRaw);
      if (!Number.isFinite(q) || q < PORTION_QTY_MIN || q > PORTION_QTY_MAX) {
        sendError(res, 422, ErrorCodes.VALIDATION_FAILED, `portionQuantity는 ${PORTION_QTY_MIN}~${PORTION_QTY_MAX} 사이여야 합니다.`, {
          field: 'portionQuantity',
        });
        return;
      }
      portionQuantity = q;
      userTotalGrams = q * template.servingGrams!;
    } else {
      const gRaw = b.totalGrams;
      const g = typeof gRaw === 'number' ? gRaw : Number(gRaw);
      if (!Number.isFinite(g) || g < TOTAL_GRAMS_MIN || g > TOTAL_GRAMS_MAX) {
        sendError(res, 422, ErrorCodes.VALIDATION_FAILED, `totalGrams는 ${TOTAL_GRAMS_MIN}~${TOTAL_GRAMS_MAX} 사이여야 합니다.`, {
          field: 'totalGrams',
        });
        return;
      }
      userTotalGrams = g;
      portionQuantity = null;
    }

    let nutrition: ReturnType<typeof computeScaledNutritionFromGrams>;
    try {
      nutrition = computeScaledNutritionFromGrams(
        {
          servingGrams: template.servingGrams!,
          calories: template.calories!,
          protein: template.protein!,
          fat: template.fat!,
          carbohydrate: template.carbohydrate!,
        },
        userTotalGrams,
      );
    } catch {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, '템플릿 기준 분량이 올바르지 않습니다.', { field: 'foodTemplateId' });
      return;
    }

    const meal = await prisma.meal.create({
      data: {
        userId,
        name: template.name,
        consumedAt,
        grams: nutrition.grams,
        calories: nutrition.calories,
        carbohydrate: nutrition.carbohydrate,
        protein: nutrition.protein,
        fat: nutrition.fat,
        note: b.note !== undefined && b.note !== null ? String(b.note) : null,
        imageUrl: b.imageUrl !== undefined && b.imageUrl !== null ? String(b.imageUrl) : null,
        foodTemplateId: templateId,
        mealInputMode: mode,
        portionQuantity,
        mealSlot,
      },
    });
    res.status(201).json({ mealId: meal.id });
    return;
  }

  const name = String(b.name ?? '').trim();
  if (!name) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, '음식명이 필요합니다.');
    return;
  }
  const calories = Number(b.calories ?? 0);
  const carbohydrate = Number(b.carbohydrate ?? 0);
  const protein = Number(b.protein ?? 0);
  const fat = Number(b.fat ?? 0);
  if (!assertNonNegativeNutrition({ calories, carbohydrate, protein, fat }, res)) return;

  const meal = await prisma.meal.create({
    data: {
      userId,
      name,
      consumedAt,
      grams: Number(b.grams ?? 100),
      calories,
      carbohydrate,
      protein,
      fat,
      note: b.note ? String(b.note) : null,
      imageUrl: b.imageUrl ? String(b.imageUrl) : null,
      foodTemplateId: null,
      mealInputMode: null,
      portionQuantity: null,
      mealSlot,
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
  const fromRaw = req.query.from;
  const toRaw = req.query.to;
  const mealSlotFilter = parseMealSlot(req.query.mealSlot);
  if (req.query.mealSlot != null && req.query.mealSlot !== '' && mealSlotFilter === null) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'mealSlot이 올바르지 않습니다.', { field: 'mealSlot' });
    return;
  }
  const consumedAt: Prisma.DateTimeFilter = {};
  if (fromRaw) {
    const from = new Date(String(fromRaw));
    if (Number.isNaN(from.getTime())) {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'from 날짜가 올바르지 않습니다.', { field: 'from' });
      return;
    }
    consumedAt.gte = from;
  }
  if (toRaw) {
    const to = new Date(String(toRaw));
    if (Number.isNaN(to.getTime())) {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'to 날짜가 올바르지 않습니다.', { field: 'to' });
      return;
    }
    consumedAt.lte = to;
  }
  const where: Prisma.MealWhereInput = {
    userId,
    active: true,
    ...(mealSlotFilter ? { mealSlot: mealSlotFilter } : {}),
    ...(Object.keys(consumedAt).length > 0 ? { consumedAt } : {}),
  };
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
        foodTemplateId: true,
        mealInputMode: true,
        portionQuantity: true,
        mealSlot: true,
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
      foodTemplateId: m.foodTemplateId,
      mealInputMode: m.mealInputMode,
      portionQuantity: m.portionQuantity,
      mealSlot: m.mealSlot,
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
  const b = req.body as Record<string, unknown>;

  const hasTplKey = Object.prototype.hasOwnProperty.call(b, 'foodTemplateId');
  if (hasTplKey && (b.foodTemplateId === null || b.foodTemplateId === '')) {
    const nextName = b.name !== undefined ? String(b.name).trim() : meal.name;
    if (!nextName) {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, '음식명이 필요합니다.', { field: 'name' });
      return;
    }
    await prisma.meal.update({
      where: { id: mealId },
      data: {
        foodTemplateId: null,
        mealInputMode: null,
        portionQuantity: null,
        name: nextName,
        ...(b.consumedAt !== undefined ? { consumedAt: new Date(String(b.consumedAt)) } : {}),
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
    return;
  }

  const rawTplId = b.foodTemplateId;
  const templateId = typeof rawTplId === 'string' && rawTplId.trim() ? rawTplId.trim() : null;

  if (templateId) {
    const mode = parseMealInputMode(b.mealInputMode);
    if (!mode) {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'mealInputMode가 필요합니다.', { field: 'mealInputMode' });
      return;
    }
    const template = await prisma.foodTemplate.findFirst({
      where: { id: templateId, active: true },
    });
    if (!template || !isTemplateNutritionComplete(template)) {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, '템플릿을 사용할 수 없습니다.', { field: 'foodTemplateId' });
      return;
    }
    let userTotalGrams: number;
    let portionQuantity: number | null = null;
    if (mode === MealInputMode.PORTION_COUNT) {
      const qRaw = b.portionQuantity;
      const q = typeof qRaw === 'number' ? qRaw : Number(qRaw);
      if (!Number.isFinite(q) || q < PORTION_QTY_MIN || q > PORTION_QTY_MAX) {
        sendError(res, 422, ErrorCodes.VALIDATION_FAILED, `portionQuantity는 ${PORTION_QTY_MIN}~${PORTION_QTY_MAX} 사이여야 합니다.`, {
          field: 'portionQuantity',
        });
        return;
      }
      portionQuantity = q;
      userTotalGrams = q * template.servingGrams!;
    } else {
      const gRaw = b.totalGrams;
      const g = typeof gRaw === 'number' ? gRaw : Number(gRaw);
      if (!Number.isFinite(g) || g < TOTAL_GRAMS_MIN || g > TOTAL_GRAMS_MAX) {
        sendError(res, 422, ErrorCodes.VALIDATION_FAILED, `totalGrams는 ${TOTAL_GRAMS_MIN}~${TOTAL_GRAMS_MAX} 사이여야 합니다.`, {
          field: 'totalGrams',
        });
        return;
      }
      userTotalGrams = g;
      portionQuantity = null;
    }
    let nutrition: ReturnType<typeof computeScaledNutritionFromGrams>;
    try {
      nutrition = computeScaledNutritionFromGrams(
        {
          servingGrams: template.servingGrams!,
          calories: template.calories!,
          protein: template.protein!,
          fat: template.fat!,
          carbohydrate: template.carbohydrate!,
        },
        userTotalGrams,
      );
    } catch {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, '템플릿 기준 분량이 올바르지 않습니다.', { field: 'foodTemplateId' });
      return;
    }
    await prisma.meal.update({
      where: { id: mealId },
      data: {
        name: template.name,
        ...(b.consumedAt !== undefined ? { consumedAt: new Date(String(b.consumedAt)) } : {}),
        grams: nutrition.grams,
        calories: nutrition.calories,
        carbohydrate: nutrition.carbohydrate,
        protein: nutrition.protein,
        fat: nutrition.fat,
        ...(b.note !== undefined ? { note: b.note ? String(b.note) : null } : {}),
        ...(b.imageUrl !== undefined ? { imageUrl: b.imageUrl ? String(b.imageUrl) : null } : {}),
        foodTemplateId: templateId,
        mealInputMode: mode,
        portionQuantity,
      },
    });
    res.json({ ok: true });
    return;
  }

  const legacy = b as Partial<{
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
      ...(legacy.name !== undefined ? { name: String(legacy.name) } : {}),
      ...(legacy.consumedAt !== undefined ? { consumedAt: new Date(legacy.consumedAt) } : {}),
      ...(legacy.grams !== undefined ? { grams: Number(legacy.grams) } : {}),
      ...(legacy.calories !== undefined ? { calories: Number(legacy.calories) } : {}),
      ...(legacy.carbohydrate !== undefined ? { carbohydrate: Number(legacy.carbohydrate) } : {}),
      ...(legacy.protein !== undefined ? { protein: Number(legacy.protein) } : {}),
      ...(legacy.fat !== undefined ? { fat: Number(legacy.fat) } : {}),
      ...(legacy.note !== undefined ? { note: legacy.note ? String(legacy.note) : null } : {}),
      ...(legacy.imageUrl !== undefined ? { imageUrl: legacy.imageUrl ? String(legacy.imageUrl) : null } : {}),
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
    if (
      message.includes('API_KEY_INVALID') ||
      message.toLowerCase().includes('api key not valid')
    ) {
      sendError(
        res,
        503,
        ErrorCodes.OCR_PROVIDER_UNAVAILABLE,
        'OCR API 키가 올바르지 않습니다. Railway의 OCR_API_KEY가 로컬 .env와 동일한지 확인해 주세요.',
      );
      return;
    }
    if (
      message.includes('PERMISSION_DENIED') ||
      message.includes('http_403') ||
      message.toLowerCase().includes('api key not enabled') ||
      message.toLowerCase().includes('access denied')
    ) {
      sendError(
        res,
        503,
        ErrorCodes.OCR_PROVIDER_UNAVAILABLE,
        'Google Vision API 접근이 거부되었습니다. Cloud Vision API 활성화와 API 키의 앱 제한(Android/iOS 전용) 해제를 확인해 주세요.',
      );
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
  const anchorRaw = req.query.anchor;
  const anchorParsed = parseAnchorDate(anchorRaw);
  if (anchorRaw !== undefined && anchorRaw !== '' && anchorParsed === null) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'anchor 날짜가 올바르지 않습니다.', { field: 'anchor' });
    return;
  }

  const now = new Date();
  let period: {
    anchor: string;
    from: Date;
    toExclusive: Date;
    label: string;
  };

  try {
    if (range === 'meal') {
      period = mealRollingBounds(now);
    } else if (range === 'day' || range === 'week' || range === 'month') {
      const anchor = anchorParsed ?? todayAnchorKst(now);
      const bounds = boundsForRange(range, anchor);
      if (isPeriodInFuture(bounds.from, todayAnchorKst(now))) {
        sendError(res, 422, ErrorCodes.VALIDATION_FAILED, '미래 기간은 조회할 수 없습니다.', { field: 'anchor' });
        return;
      }
      period = bounds;
    } else {
      throw new Error('bad_range');
    }
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
    where: {
      userId,
      active: true,
      consumedAt: { gte: period.from, lt: period.toExclusive },
    },
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
    period: {
      anchor: period.anchor,
      from: period.from.toISOString(),
      toExclusive: period.toExclusive.toISOString(),
      label: period.label,
    },
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
