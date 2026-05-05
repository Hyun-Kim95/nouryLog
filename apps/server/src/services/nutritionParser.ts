export type ParsedNutrition = {
  calories: number;
  carbohydrate: number;
  protein: number;
  fat: number;
  confidence: number;
  missingFields: string[];
};

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

  const missingFields: string[] = [];
  if (calories === null) missingFields.push('calories');
  if (carbohydrate === null) missingFields.push('carbohydrate');
  if (protein === null) missingFields.push('protein');
  if (fat === null) missingFields.push('fat');

  const found = 4 - missingFields.length;
  const confidence = found / 4;

  return {
    calories: calories ?? 0,
    carbohydrate: carbohydrate ?? 0,
    protein: protein ?? 0,
    fat: fat ?? 0,
    confidence,
    missingFields,
  };
}
