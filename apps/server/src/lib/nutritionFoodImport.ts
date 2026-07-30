import { normalizeNutritionFoodName } from './nutritionFoodNormalize.js';

export const SKIP_CODES = [
  'EMPTY_EXTERNAL_ID',
  'EMPTY_NAME',
  'NAME_TOO_LONG',
  'EXTERNAL_ID_TOO_LONG',
  'INVALID_MACRO',
  'INVALID_SERVING',
  'SCALE_FAILED',
  'WRONG_SOURCE',
  'CATEGORY_TRUNCATED',
] as const;

export type SkipCode = (typeof SKIP_CODES)[number];

export type ImportSkip = { row: number; code: SkipCode; message?: string };

export type NutritionFoodImportRow = {
  source: string;
  externalId: string;
  name: string;
  nameNormalized: string;
  category: string | null;
  per100gCalories: number;
  per100gProtein: number;
  per100gFat: number;
  per100gCarbohydrate: number;
  defaultServingGrams: number | null;
  sourceVersion: string;
  active?: boolean;
  rawPayload?: unknown;
};

const NAME_MAX = 120;
const EXTERNAL_ID_MAX = 64;
const CATEGORY_MAX = 50;
const SOURCE_VERSION_MAX = 40;

function isFiniteNonNeg(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function validateImportArgs(args: {
  file: string | undefined;
  sourceVersion: string | undefined;
}): { ok: true; file: string; sourceVersion: string } | { ok: false; reason: string } {
  const file = args.file?.trim();
  const sourceVersion = args.sourceVersion?.trim();
  if (!file) return { ok: false, reason: 'missing --file' };
  if (!sourceVersion) return { ok: false, reason: 'missing --sourceVersion' };
  if (sourceVersion.length > SOURCE_VERSION_MAX) {
    return { ok: false, reason: 'sourceVersion too long' };
  }
  return { ok: true, file, sourceVersion };
}

/** Parse & validate raw JSON array rows into upsert-ready rows (last duplicate wins). */
export function parseNutritionFoodRows(
  rawRows: unknown[],
  sourceVersion: string,
): { rows: NutritionFoodImportRow[]; skipped: ImportSkip[]; duplicateInFile: number } {
  const skipped: ImportSkip[] = [];
  const byKey = new Map<string, NutritionFoodImportRow>();
  let duplicateInFile = 0;

  rawRows.forEach((raw, idx) => {
    const rowNum = idx + 1;
    if (!raw || typeof raw !== 'object') {
      skipped.push({ row: rowNum, code: 'INVALID_MACRO', message: 'row not object' });
      return;
    }
    const o = raw as Record<string, unknown>;
    const source = String(o.source ?? 'MFDS').trim() || 'MFDS';
    if (source !== 'MFDS') {
      skipped.push({ row: rowNum, code: 'WRONG_SOURCE' });
      return;
    }
    const externalId = String(o.externalId ?? '').trim();
    if (!externalId) {
      skipped.push({ row: rowNum, code: 'EMPTY_EXTERNAL_ID' });
      return;
    }
    if (externalId.length > EXTERNAL_ID_MAX) {
      skipped.push({ row: rowNum, code: 'EXTERNAL_ID_TOO_LONG' });
      return;
    }
    const name = String(o.name ?? '').trim();
    if (!name) {
      skipped.push({ row: rowNum, code: 'EMPTY_NAME' });
      return;
    }
    if (name.length > NAME_MAX) {
      skipped.push({ row: rowNum, code: 'NAME_TOO_LONG' });
      return;
    }

    const cal = num(o.per100gCalories ?? o.calories);
    const pro = num(o.per100gProtein ?? o.protein);
    const fat = num(o.per100gFat ?? o.fat);
    const carb = num(o.per100gCarbohydrate ?? o.carbohydrate);
    if (
      cal === null ||
      pro === null ||
      fat === null ||
      carb === null ||
      !isFiniteNonNeg(cal) ||
      !isFiniteNonNeg(pro) ||
      !isFiniteNonNeg(fat) ||
      !isFiniteNonNeg(carb)
    ) {
      skipped.push({ row: rowNum, code: 'INVALID_MACRO' });
      return;
    }

    // 참고 1인분 g: 정규화 필드 또는 MFDS SERVING_WT / servingWt 별칭 (PRD reference-serving AC-05)
    let defaultServingGrams: number | null = null;
    const servingRaw =
      o.defaultServingGrams !== undefined && o.defaultServingGrams !== null && o.defaultServingGrams !== ''
        ? o.defaultServingGrams
        : o.SERVING_WT !== undefined && o.SERVING_WT !== null && o.SERVING_WT !== ''
          ? o.SERVING_WT
          : o.servingWt !== undefined && o.servingWt !== null && o.servingWt !== ''
            ? o.servingWt
            : undefined;
    if (servingRaw !== undefined) {
      const s = num(servingRaw);
      if (s === null || !(s > 0)) {
        skipped.push({ row: rowNum, code: 'INVALID_SERVING' });
        return;
      }
      defaultServingGrams = s;
    }

    let category: string | null =
      o.category === undefined || o.category === null ? null : String(o.category).trim() || null;
    if (category && category.length > CATEGORY_MAX) {
      category = category.slice(0, CATEGORY_MAX);
      skipped.push({ row: rowNum, code: 'CATEGORY_TRUNCATED', message: 'truncated' });
    }

    const key = `${source}\0${externalId}`;
    if (byKey.has(key)) duplicateInFile += 1;

    const row: NutritionFoodImportRow = {
      source,
      externalId,
      name,
      nameNormalized: normalizeNutritionFoodName(name),
      category,
      per100gCalories: cal,
      per100gProtein: pro,
      per100gFat: fat,
      per100gCarbohydrate: carb,
      defaultServingGrams,
      sourceVersion,
      rawPayload: o.rawPayload !== undefined ? o.rawPayload : undefined,
    };
    if (typeof o.active === 'boolean') row.active = o.active;

    byKey.set(key, row);
  });

  return { rows: [...byKey.values()], skipped, duplicateInFile };
}

export type ImportReport = {
  upserted: number;
  skipped: number;
  skippedByReason: Partial<Record<SkipCode, number>>;
  duplicateInFile: number;
  sourceVersion: string;
  committedChunks: number;
  exitCode: number;
  errors: ImportSkip[];
};

export function summarizeSkips(skipped: ImportSkip[]): Partial<Record<SkipCode, number>> {
  const out: Partial<Record<SkipCode, number>> = {};
  for (const s of skipped) {
    out[s.code] = (out[s.code] ?? 0) + 1;
  }
  return out;
}
