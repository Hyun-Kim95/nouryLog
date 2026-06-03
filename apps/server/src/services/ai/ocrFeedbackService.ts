import { prisma } from '../../lib/prisma.js';
import { indexOcrCorrectionPattern, indexOcrRawText } from '../vector/aiIndexWorker.js';

const NUTRITION_FIELDS = ['calories', 'protein', 'carbohydrate', 'fat'] as const;

export type OcrNutritionFields = {
  calories?: number;
  protein?: number;
  carbohydrate?: number;
  fat?: number;
  rawText?: string;
};

function numOrUndef(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function pickNutrition(obj: Record<string, unknown>): OcrNutritionFields {
  return {
    calories: numOrUndef(obj.calories),
    protein: numOrUndef(obj.protein),
    carbohydrate: numOrUndef(obj.carbohydrate),
    fat: numOrUndef(obj.fat),
    rawText: typeof obj.rawText === 'string' ? obj.rawText.slice(0, 2000) : undefined,
  };
}

export function diffOcrFields(
  raw: OcrNutritionFields,
  corrected: OcrNutritionFields,
): { changedFields: string[]; hasDiff: boolean } {
  const changedFields: string[] = [];
  for (const field of NUTRITION_FIELDS) {
    const a = raw[field];
    const b = corrected[field];
    if (a === undefined && b === undefined) continue;
    if (a !== b) changedFields.push(field);
  }
  return { changedFields, hasDiff: changedFields.length > 0 };
}

function assertNonNegative(fields: OcrNutritionFields): string | null {
  for (const field of NUTRITION_FIELDS) {
    const v = fields[field];
    if (v !== undefined && v < 0) return field;
  }
  return null;
}

function correctionPatternSummary(changedFields: string[], raw: OcrNutritionFields, corrected: OcrNutritionFields): string {
  const parts = changedFields.map((f) => {
    const key = f as (typeof NUTRITION_FIELDS)[number];
    return `${key}:${raw[key]}->${corrected[key]}`;
  });
  return `ocr_correction:${parts.join(';')}`;
}

export type OcrFeedbackInput = {
  userId: string;
  rawOcr: Record<string, unknown>;
  corrected: Record<string, unknown>;
  mealId?: string | null;
  imageHash?: string | null;
  confidence?: number | null;
};

export async function handleOcrFeedback(input: OcrFeedbackInput) {
  const raw = pickNutrition(input.rawOcr);
  const corrected = pickNutrition(input.corrected);

  const negField = assertNonNegative(corrected);
  if (negField) {
    const err = new Error('negative_nutrition');
    (err as Error & { code: string; field: string }).code = 'VALIDATION_FAILED';
    (err as Error & { field: string }).field = negField;
    throw err;
  }

  const { changedFields, hasDiff } = diffOcrFields(raw, corrected);
  if (!hasDiff) {
    const err = new Error('no_diff');
    (err as Error & { code: string; field: string }).code = 'VALIDATION_FAILED';
    (err as Error & { field: string }).field = 'corrected';
    throw err;
  }

  if (input.mealId) {
    const meal = await prisma.meal.findFirst({
      where: { id: input.mealId, userId: input.userId, active: true },
    });
    if (!meal) {
      const err = new Error('meal_not_found');
      (err as Error & { code: string }).code = 'NOT_FOUND';
      throw err;
    }
  }

  const existing = await prisma.ocrFeedback.findFirst({
    where: {
      userId: input.userId,
      mealId: input.mealId ?? null,
      changedFields: { equals: changedFields },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    return { id: existing.id, changedFields: existing.changedFields, indexed: true, created: false };
  }

  const row = await prisma.ocrFeedback.create({
    data: {
      userId: input.userId,
      mealId: input.mealId ?? null,
      imageHash: input.imageHash ?? null,
      rawJson: { ...raw, confidence: input.confidence ?? undefined },
      correctedJson: corrected,
      changedFields,
    },
  });

  let indexed = false;
  if (raw.rawText?.trim()) {
    const rawIndex = await indexOcrRawText({
      userId: input.userId,
      sourceId: row.id,
      rawText: raw.rawText,
    });
    indexed = rawIndex.indexed;
  }

  const pattern = correctionPatternSummary(changedFields, raw, corrected);
  await indexOcrCorrectionPattern(pattern);

  return { id: row.id, changedFields, indexed, created: true };
}
