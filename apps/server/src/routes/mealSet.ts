import { Router, type Request, type Response } from 'express';
import { MealInputMode, Prisma } from '@prisma/client';
import type { MealSlot, SnackPlacement } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { sendError, ErrorCodes } from '../lib/errors.js';
import { computeScaledNutritionFromGrams } from '../lib/mealFromTemplate.js';
import { parseMealClientRequestId } from '../lib/mealClientRequestId.js';
import { parseMealSlot } from '../lib/mealSlot.js';
import { parseSnackPlacement } from '../lib/snackPlacement.js';
import {
  MEAL_SET_ACTIVE_MAX,
  MEAL_SET_ITEMS_MAX,
  deriveItemClientRequestId,
  findUnavailableTemplateItems,
  isConsumedAtInFutureKst,
  resolveApplySnackPlacement,
  selectApplicableItems,
  validateMealSetName,
} from '../lib/mealSet.js';

export const mealSetRouter = Router();
mealSetRouter.use(requireAuth);

const PORTION_QTY_MIN = 0.25;
const PORTION_QTY_MAX = 50;
const TOTAL_GRAMS_MIN = 1;
const TOTAL_GRAMS_MAX = 5000;
// kind=manual(수기 항목) 스냅샷 한계
const MANUAL_NAME_MAX = 60;
const MANUAL_CALORIES_MAX = 10000;
const MANUAL_MACRO_MAX = 2000;
const MANUAL_GRAMS_MIN = 1;
const MANUAL_GRAMS_MAX = 5000;
const MANUAL_GRAMS_DEFAULT = 100;

// 일반 사용자 + 활성 계정만 접근 (me 라우터와 동일 정책)
mealSetRouter.use(async (req, res, next) => {
  if (req.auth!.role !== 'USER') {
    sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '일반 사용자만 사용할 수 있습니다.');
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    select: { active: true },
  });
  if (!user?.active) {
    sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '비활성화된 계정입니다.');
    return;
  }
  next();
});

function parseMealInputMode(raw: unknown): MealInputMode | null {
  if (raw === MealInputMode.PORTION_COUNT || raw === MealInputMode.TOTAL_GRAMS) return raw;
  if (raw === 'PORTION_COUNT') return MealInputMode.PORTION_COUNT;
  if (raw === 'TOTAL_GRAMS') return MealInputMode.TOTAL_GRAMS;
  return null;
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

type ParsedTemplateItem = {
  kind: 'template';
  foodTemplateId: string;
  mealInputMode: MealInputMode;
  portionQuantity: number | null;
  totalGrams: number | null;
  displayOrder: number;
};

type ParsedManualItem = {
  kind: 'manual';
  name: string;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  grams: number;
  displayOrder: number;
};

type ParsedItemInput = ParsedTemplateItem | ParsedManualItem;

type ItemsParse =
  | { ok: true; items: ParsedItemInput[] }
  | { ok: false; message: string; field?: string };

function parseNonNegative(raw: unknown, max: number): number | null {
  const n = typeof raw === 'number' ? raw : Number(raw ?? 0);
  if (!Number.isFinite(n) || n < 0 || n > max) return null;
  return n;
}

// kind=template(음식 템플릿) 또는 kind=manual(수기 스냅샷) 항목 허용
function parseItemsInput(raw: unknown): ItemsParse {
  if (!Array.isArray(raw)) {
    return { ok: false, message: '항목 목록이 필요합니다.', field: 'items' };
  }
  if (raw.length === 0) {
    return { ok: false, message: '항목을 1개 이상 추가해 주세요.', field: 'items' };
  }
  if (raw.length > MEAL_SET_ITEMS_MAX) {
    return { ok: false, message: `항목은 최대 ${MEAL_SET_ITEMS_MAX}개까지 추가할 수 있습니다.`, field: 'items' };
  }
  const items: ParsedItemInput[] = [];
  for (let i = 0; i < raw.length; i++) {
    const it = raw[i] as Record<string, unknown>;
    const kind = it.kind === undefined ? 'template' : String(it.kind);
    if (kind === 'template') {
      const tplId = typeof it.foodTemplateId === 'string' ? it.foodTemplateId.trim() : '';
      if (!tplId) {
        return { ok: false, message: '음식 템플릿을 선택해 주세요.', field: `items[${i}].foodTemplateId` };
      }
      const mode = parseMealInputMode(it.mealInputMode);
      if (!mode) {
        return { ok: false, message: 'mealInputMode가 필요합니다.', field: `items[${i}].mealInputMode` };
      }
      let portionQuantity: number | null = null;
      let totalGrams: number | null = null;
      if (mode === MealInputMode.PORTION_COUNT) {
        const q = typeof it.portionQuantity === 'number' ? it.portionQuantity : Number(it.portionQuantity);
        if (!Number.isFinite(q) || q < PORTION_QTY_MIN || q > PORTION_QTY_MAX) {
          return { ok: false, message: `portionQuantity는 ${PORTION_QTY_MIN}~${PORTION_QTY_MAX} 사이여야 합니다.`, field: `items[${i}].portionQuantity` };
        }
        portionQuantity = q;
      } else {
        const g = typeof it.totalGrams === 'number' ? it.totalGrams : Number(it.totalGrams);
        if (!Number.isFinite(g) || g < TOTAL_GRAMS_MIN || g > TOTAL_GRAMS_MAX) {
          return { ok: false, message: `totalGrams는 ${TOTAL_GRAMS_MIN}~${TOTAL_GRAMS_MAX} 사이여야 합니다.`, field: `items[${i}].totalGrams` };
        }
        totalGrams = g;
      }
      items.push({ kind: 'template', foodTemplateId: tplId, mealInputMode: mode, portionQuantity, totalGrams, displayOrder: i });
    } else if (kind === 'manual') {
      const name = typeof it.name === 'string' ? it.name.trim() : '';
      if (!name) {
        return { ok: false, message: '음식명을 입력해 주세요.', field: `items[${i}].name` };
      }
      if (name.length > MANUAL_NAME_MAX) {
        return { ok: false, message: `음식명은 최대 ${MANUAL_NAME_MAX}자까지 가능합니다.`, field: `items[${i}].name` };
      }
      const calories = parseNonNegative(it.calories, MANUAL_CALORIES_MAX);
      const protein = parseNonNegative(it.protein, MANUAL_MACRO_MAX);
      const carbohydrate = parseNonNegative(it.carbohydrate, MANUAL_MACRO_MAX);
      const fat = parseNonNegative(it.fat, MANUAL_MACRO_MAX);
      if (calories == null || protein == null || carbohydrate == null || fat == null) {
        return { ok: false, message: '영양 값이 올바르지 않습니다.', field: `items[${i}].calories` };
      }
      let grams = MANUAL_GRAMS_DEFAULT;
      if (it.grams != null && it.grams !== '') {
        const g = typeof it.grams === 'number' ? it.grams : Number(it.grams);
        if (!Number.isFinite(g) || g < MANUAL_GRAMS_MIN || g > MANUAL_GRAMS_MAX) {
          return { ok: false, message: `grams는 ${MANUAL_GRAMS_MIN}~${MANUAL_GRAMS_MAX} 사이여야 합니다.`, field: `items[${i}].grams` };
        }
        grams = g;
      }
      items.push({ kind: 'manual', name, calories, protein, carbohydrate, fat, grams, displayOrder: i });
    } else {
      return { ok: false, message: '지원하지 않는 항목 유형입니다.', field: `items[${i}].kind` };
    }
  }
  return { ok: true, items };
}

// 파싱된 항목 → Prisma create 데이터 (template/manual 분기)
function toItemCreateData(it: ParsedItemInput) {
  if (it.kind === 'manual') {
    return {
      kind: 'manual',
      foodTemplateId: null,
      mealInputMode: null,
      portionQuantity: null,
      totalGrams: null,
      name: it.name,
      calories: it.calories,
      protein: it.protein,
      carbohydrate: it.carbohydrate,
      fat: it.fat,
      grams: it.grams,
      displayOrder: it.displayOrder,
    };
  }
  return {
    kind: 'template',
    foodTemplateId: it.foodTemplateId,
    mealInputMode: it.mealInputMode,
    portionQuantity: it.portionQuantity,
    totalGrams: it.totalGrams,
    displayOrder: it.displayOrder,
  };
}

type MealSetWithItems = Prisma.MealSetGetPayload<{ include: { items: true } }>;

function serializeMealSet(set: MealSetWithItems) {
  return {
    id: set.id,
    name: set.name,
    defaultMealSlot: set.defaultMealSlot,
    defaultSnackPlacement: set.defaultSnackPlacement,
    createdAt: set.createdAt,
    items: [...set.items]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((it) => ({
        id: it.id,
        kind: it.kind,
        foodTemplateId: it.foodTemplateId,
        mealInputMode: it.mealInputMode,
        portionQuantity: it.portionQuantity,
        totalGrams: it.totalGrams,
        name: it.name,
        calories: it.calories,
        protein: it.protein,
        carbohydrate: it.carbohydrate,
        fat: it.fat,
        grams: it.grams,
        displayOrder: it.displayOrder,
      })),
  };
}

// 세트 기본값(이름/끼니/간식위치) 파싱 공통
function parseSetMeta(
  b: Record<string, unknown>,
): { ok: true; name: string; mealSlot: MealSlot; snackPlacement: SnackPlacement | null } | { ok: false; message: string; field?: string } {
  const nameCheck = validateMealSetName(b.name);
  if (!nameCheck.ok) return { ok: false, message: nameCheck.message, field: 'name' };

  const slot = parseMealSlot(b.defaultMealSlot);
  if (!slot) return { ok: false, message: '기본 끼니가 올바르지 않습니다.', field: 'defaultMealSlot' };

  let snackPlacement: SnackPlacement | null = null;
  if (slot === 'SNACK') {
    const parsed = parseSnackPlacement(b.defaultSnackPlacement);
    if (!parsed) return { ok: false, message: '간식 위치를 선택해 주세요.', field: 'defaultSnackPlacement' };
    snackPlacement = parsed;
  }
  return { ok: true, name: nameCheck.value, mealSlot: slot, snackPlacement };
}

// 비동기 핸들러 공통 래퍼 (me.ts 컨벤션: 미처리 예외 → 500 INTERNAL_SERVER_ERROR)
function wrap(fn: (req: Request, res: Response) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (e) {
      console.error('[mealSet]', e);
      if (!res.headersSent) {
        sendError(res, 500, ErrorCodes.INTERNAL_SERVER_ERROR, '서버 오류가 발생했습니다.');
      }
    }
  };
}

// GET /me/meal-sets — 활성 세트 목록
mealSetRouter.get('/me/meal-sets', wrap(async (req, res) => {
  const userId = req.auth!.userId;
  const sets = await prisma.mealSet.findMany({
    where: { userId, active: true },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ items: sets.map(serializeMealSet) });
}));

// POST /me/meal-sets — 세트 생성
mealSetRouter.post('/me/meal-sets', wrap(async (req, res) => {
  const userId = req.auth!.userId;
  const b = (req.body ?? {}) as Record<string, unknown>;

  const meta = parseSetMeta(b);
  if (!meta.ok) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, meta.message, meta.field ? { field: meta.field } : {});
    return;
  }
  const itemsParse = parseItemsInput(b.items);
  if (!itemsParse.ok) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, itemsParse.message, itemsParse.field ? { field: itemsParse.field } : {});
    return;
  }

  const activeCount = await prisma.mealSet.count({ where: { userId, active: true } });
  if (activeCount >= MEAL_SET_ACTIVE_MAX) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, `세트는 최대 ${MEAL_SET_ACTIVE_MAX}개까지 만들 수 있습니다.`, { field: 'meal-sets' });
    return;
  }

  const created = await prisma.mealSet.create({
    data: {
      userId,
      name: meta.name,
      defaultMealSlot: meta.mealSlot,
      defaultSnackPlacement: meta.snackPlacement,
      items: {
        create: itemsParse.items.map(toItemCreateData),
      },
    },
    include: { items: true },
  });
  res.status(201).json(serializeMealSet(created));
}));

// 본인 소유 활성 세트 조회 (없거나 타인 → null)
async function findOwnedActiveSet(userId: string, id: string) {
  return prisma.mealSet.findFirst({
    where: { id, userId, active: true },
    include: { items: true },
  });
}

// GET /me/meal-sets/:id — 단건 상세
mealSetRouter.get('/me/meal-sets/:id', wrap(async (req, res) => {
  const userId = req.auth!.userId;
  const set = await findOwnedActiveSet(userId, req.params.id);
  if (!set) {
    sendError(res, 404, ErrorCodes.NOT_FOUND, '세트를 찾을 수 없습니다.');
    return;
  }
  res.json(serializeMealSet(set));
}));

// PUT /me/meal-sets/:id — 이름/기본 끼니/항목 전체 갱신
mealSetRouter.put('/me/meal-sets/:id', wrap(async (req, res) => {
  const userId = req.auth!.userId;
  const existing = await prisma.mealSet.findFirst({
    where: { id: req.params.id, userId, active: true },
    select: { id: true },
  });
  if (!existing) {
    sendError(res, 404, ErrorCodes.NOT_FOUND, '세트를 찾을 수 없습니다.');
    return;
  }

  const b = (req.body ?? {}) as Record<string, unknown>;
  const meta = parseSetMeta(b);
  if (!meta.ok) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, meta.message, meta.field ? { field: meta.field } : {});
    return;
  }
  const itemsParse = parseItemsInput(b.items);
  if (!itemsParse.ok) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, itemsParse.message, itemsParse.field ? { field: itemsParse.field } : {});
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.mealSetItem.deleteMany({ where: { mealSetId: existing.id } });
    return tx.mealSet.update({
      where: { id: existing.id },
      data: {
        name: meta.name,
        defaultMealSlot: meta.mealSlot,
        defaultSnackPlacement: meta.snackPlacement,
        items: {
          create: itemsParse.items.map(toItemCreateData),
        },
      },
      include: { items: true },
    });
  });
  res.json(serializeMealSet(updated));
}));

// PATCH /me/meal-sets/:id/deactivate — soft delete (멱등)
mealSetRouter.patch('/me/meal-sets/:id/deactivate', wrap(async (req, res) => {
  const userId = req.auth!.userId;
  const set = await prisma.mealSet.findFirst({
    where: { id: req.params.id, userId },
    select: { id: true, active: true },
  });
  if (!set) {
    sendError(res, 404, ErrorCodes.NOT_FOUND, '세트를 찾을 수 없습니다.');
    return;
  }
  if (set.active) {
    await prisma.mealSet.update({
      where: { id: set.id },
      data: { active: false, deactivatedAt: new Date() },
    });
  }
  res.json({ id: set.id, active: false });
}));

// POST /me/meal-sets/:id/apply — 한 번에 등록
mealSetRouter.post('/me/meal-sets/:id/apply', wrap(async (req, res) => {
  const userId = req.auth!.userId;
  const b = (req.body ?? {}) as Record<string, unknown>;

  const clientRequestId = parseMealClientRequestId(b.clientRequestId);
  if (!clientRequestId) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'clientRequestId가 필요합니다.', { field: 'clientRequestId' });
    return;
  }

  const set = await findOwnedActiveSet(userId, req.params.id);
  if (!set) {
    sendError(res, 404, ErrorCodes.NOT_FOUND, '세트를 찾을 수 없습니다.');
    return;
  }

  const consumedAt = b.consumedAt ? new Date(String(b.consumedAt)) : new Date();
  if (Number.isNaN(consumedAt.getTime())) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'consumedAt이 올바르지 않습니다.', { field: 'consumedAt' });
    return;
  }
  if (isConsumedAtInFutureKst(consumedAt)) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, '미래 날짜에는 등록할 수 없습니다.', { field: 'consumedAt' });
    return;
  }

  // 실효 끼니 / 간식 위치 (override 우선)
  let effectiveSlot: MealSlot = set.defaultMealSlot;
  if (b.mealSlot != null && b.mealSlot !== '') {
    const slot = parseMealSlot(b.mealSlot);
    if (!slot) {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'mealSlot이 올바르지 않습니다.', { field: 'mealSlot' });
      return;
    }
    effectiveSlot = slot;
  }
  let overridePlacement: SnackPlacement | null | undefined;
  if (b.snackPlacement != null && b.snackPlacement !== '') {
    const parsed = parseSnackPlacement(b.snackPlacement);
    if (!parsed) {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'snackPlacement이 올바르지 않습니다.', { field: 'snackPlacement' });
      return;
    }
    overridePlacement = parsed;
  }
  const placementResult = resolveApplySnackPlacement(effectiveSlot, set.defaultSnackPlacement, overridePlacement);
  if (!placementResult.ok) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, placementResult.message, { field: 'snackPlacement' });
    return;
  }
  const snackPlacement = placementResult.value;

  // 제외 후 등록 대상 결정 (D3)
  const excludeItemIds = Array.isArray(b.excludeItemIds) ? b.excludeItemIds.map(String) : [];
  const { applicable, skippedItemIds } = selectApplicableItems(set.items, excludeItemIds);
  if (applicable.length === 0) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, '등록할 항목이 없습니다.', { field: 'items' });
    return;
  }

  // 사전 검증: 템플릿 사용 가능 여부 (AC-05/AC-15). manual 항목은 스냅샷이라 항상 등록 가능.
  const templateItems = applicable.filter((it) => it.kind === 'template');
  const templateIds = templateItems
    .map((it) => it.foodTemplateId)
    .filter((v): v is string => typeof v === 'string');
  const templates = await prisma.foodTemplate.findMany({ where: { id: { in: templateIds } } });
  const tplById = new Map(templates.map((t) => [t.id, t]));

  const unavailable = findUnavailableTemplateItems(
    templateItems.map((it) => {
      const tpl = it.foodTemplateId ? tplById.get(it.foodTemplateId) : undefined;
      return {
        itemId: it.id,
        foodTemplateId: it.foodTemplateId,
        templateActive: !!tpl?.active,
        nutritionComplete: !!tpl && isTemplateNutritionComplete(tpl),
      };
    }),
  );
  if (unavailable.length > 0) {
    sendError(res, 409, ErrorCodes.MEAL_SET_ITEM_UNAVAILABLE, '사용할 수 없는 음식이 포함돼 있습니다.', {
      items: unavailable,
    });
    return;
  }

  // 항목별 멱등키로 기존 생성분 확인 (AC-07/AC-14)
  const keyByItemId = new Map(
    applicable.map((it) => [it.id, deriveItemClientRequestId(clientRequestId, it.id)]),
  );
  const derivedKeys = [...keyByItemId.values()];
  const existingMeals = await prisma.meal.findMany({
    where: { userId, clientRequestId: { in: derivedKeys }, active: true },
    select: { id: true, clientRequestId: true },
  });
  const existingIdByKey = new Map(existingMeals.map((m) => [m.clientRequestId!, m.id]));

  // 누락 항목만 트랜잭션으로 일괄 생성 (AC-03/AC-04 원자성)
  const createdMealIds = await prisma.$transaction(async (tx) => {
    const ids: string[] = [];
    for (const it of applicable) {
      const key = keyByItemId.get(it.id)!;
      const existingId = existingIdByKey.get(key);
      if (existingId) {
        ids.push(existingId);
        continue;
      }
      // manual 항목: 저장된 영양 스냅샷 그대로 수기 식사 생성
      if (it.kind === 'manual') {
        const meal = await tx.meal.create({
          data: {
            userId,
            name: it.name ?? '음식',
            consumedAt,
            grams: it.grams ?? MANUAL_GRAMS_DEFAULT,
            calories: it.calories ?? 0,
            carbohydrate: it.carbohydrate ?? 0,
            protein: it.protein ?? 0,
            fat: it.fat ?? 0,
            foodTemplateId: null,
            mealInputMode: null,
            portionQuantity: null,
            mealSlot: effectiveSlot,
            snackPlacement,
            clientRequestId: key,
          },
          select: { id: true },
        });
        ids.push(meal.id);
        continue;
      }
      const tpl = tplById.get(it.foodTemplateId!)!;
      const userTotalGrams =
        it.mealInputMode === MealInputMode.PORTION_COUNT
          ? (it.portionQuantity ?? 0) * tpl.servingGrams!
          : it.totalGrams ?? 0;
      const nutrition = computeScaledNutritionFromGrams(
        {
          servingGrams: tpl.servingGrams!,
          calories: tpl.calories!,
          protein: tpl.protein!,
          fat: tpl.fat!,
          carbohydrate: tpl.carbohydrate!,
        },
        userTotalGrams,
      );
      const meal = await tx.meal.create({
        data: {
          userId,
          name: tpl.name,
          consumedAt,
          grams: nutrition.grams,
          calories: nutrition.calories,
          carbohydrate: nutrition.carbohydrate,
          protein: nutrition.protein,
          fat: nutrition.fat,
          foodTemplateId: tpl.id,
          mealInputMode: it.mealInputMode,
          portionQuantity: it.mealInputMode === MealInputMode.PORTION_COUNT ? it.portionQuantity : null,
          mealSlot: effectiveSlot,
          snackPlacement,
          clientRequestId: key,
        },
        select: { id: true },
      });
      ids.push(meal.id);
    }
    return ids;
  });

  res.status(200).json({ createdMealIds, skippedItemIds });
}));
