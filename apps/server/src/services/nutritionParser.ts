export type ParsedNutrition = {
  calories: number;
  carbohydrate: number;
  protein: number;
  fat: number;
  /** 1회 제공량(g). 미검출·범위 밖이면 null. */
  servingGrams: number | null;
  confidence: number;
  missingFields: string[];
};

const SERVING_GRAMS_MIN = 1;
const SERVING_GRAMS_MAX = 5000;

export const MACRO_MISSING_FIELDS = ['calories', 'carbohydrate', 'protein', 'fat'] as const;

function extractNumber(text: string, patterns: RegExp[]): number | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const v = Number(m[1].replace(',', '.'));
      if (Number.isFinite(v)) return v;
    }
  }
  return null;
}

function clampServingGrams(raw: number | null): number | null {
  if (raw === null || !Number.isFinite(raw)) return null;
  if (raw < SERVING_GRAMS_MIN || raw > SERVING_GRAMS_MAX) return null;
  return raw;
}

/** 1회 제공량·serving size·내용량 근처 g. OCR 줄바꿈·「그램」 단위 허용. ml 무시. */
export function extractServingGrams(text: string): number | null {
  const normalized = text
    .toLowerCase()
    .replace(/\r/g, '\n')
    .replace(/[ \t\u00a0]+/g, ' ');
  // `그램` 뒤 \b는 JS에서 한글에 깨지므로 g만 word-boundary, 그램은 단위 자체로 종료.
  const unit = String.raw`(?:g\b|그램)`;
  const raw = extractNumber(normalized, [
    new RegExp(String.raw`1\s*회[\s\S]{0,12}?제공\s*량[\s\S]{0,24}?([0-9]+(?:[.,][0-9]+)?)\s*${unit}`, 'i'),
    new RegExp(String.raw`1회제공량[\s\S]{0,24}?([0-9]+(?:[.,][0-9]+)?)\s*${unit}`, 'i'),
    /serving\s*size[\s\S]{0,24}?([0-9]+(?:[.,][0-9]+)?)\s*g\b/i,
    new RegExp(String.raw`내용\s*량[\s\S]{0,24}?([0-9]+(?:[.,][0-9]+)?)\s*${unit}`, 'i'),
    new RegExp(String.raw`제공\s*량[\s\S]{0,20}?([0-9]+(?:[.,][0-9]+)?)\s*${unit}`, 'i'),
    new RegExp(String.raw`1\s*회[\s\S]{0,8}?([0-9]+(?:[.,][0-9]+)?)\s*${unit}`, 'i'),
  ]);
  return clampServingGrams(raw);
}

export function allMacrosMissing(missingFields: string[]): boolean {
  return MACRO_MISSING_FIELDS.every((f) => missingFields.includes(f));
}

export function parseNutritionFromText(text: string): ParsedNutrition {
  const normalized = text
    .toLowerCase()
    .replace(/\r/g, '\n')
    .replace(/kcal/g, ' kcal')
    .replace(/탄수화물/g, 'carbohydrate')
    .replace(/단백질/g, 'protein')
    .replace(/지방/g, 'fat')
    .replace(/열량/g, 'calories');

  const calories = extractNumber(normalized, [
    /calories[^0-9]{0,10}([0-9]+(?:[.,][0-9]+)?)/i,
    /([0-9]+(?:[.,][0-9]+)?)\s*kcal/i,
  ]);
  const carbohydrate = extractNumber(normalized, [/carbohydrate[^0-9]{0,10}([0-9]+(?:[.,][0-9]+)?)/i]);
  const protein = extractNumber(normalized, [/protein[^0-9]{0,10}([0-9]+(?:[.,][0-9]+)?)/i]);
  const fat = extractNumber(normalized, [/fat[^0-9]{0,10}([0-9]+(?:[.,][0-9]+)?)/i]);
  const servingGrams = extractServingGrams(text);

  const missingFields: string[] = [];
  if (calories === null) missingFields.push('calories');
  if (carbohydrate === null) missingFields.push('carbohydrate');
  if (protein === null) missingFields.push('protein');
  if (fat === null) missingFields.push('fat');
  if (servingGrams === null) missingFields.push('servingGrams');

  const found = 4 - MACRO_MISSING_FIELDS.filter((f) => missingFields.includes(f)).length;
  const confidence = found / 4;

  return {
    calories: calories ?? 0,
    carbohydrate: carbohydrate ?? 0,
    protein: protein ?? 0,
    fat: fat ?? 0,
    servingGrams,
    confidence,
    missingFields,
  };
}
