/** OCR rawText에서 1회 제공량(g) 추출. 서버 nutritionParser와 동치에 가깝게 유지. */

const SERVING_GRAMS_MIN = 1;
const SERVING_GRAMS_MAX = 5000;

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

/**
 * Vision OCR이 줄바꿈으로 쪼갠 「1회 / 제공량 / 30g」 형태도 허용.
 * ml·그램 미표기만 있는 줄은 제외.
 */
export function extractServingGramsFromOcrText(text: string | undefined | null): number | null {
  if (!text || !text.trim()) return null;
  const normalized = text
    .toLowerCase()
    .replace(/\r/g, '\n')
    // OCR 노이즈: 공백·줄바꿈을 넓게 허용
    .replace(/[ \t\u00a0]+/g, ' ');
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
