export type ManualNutritionStrings = {
  calories: string;
  protein: string;
  carbohydrate: string;
  fat: string;
};

export type ManualNutrition = {
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
};

export function parseManualNutrition(fields: ManualNutritionStrings): ManualNutrition {
  const calories = Number(String(fields.calories).replace(',', '.'));
  const protein = Number(String(fields.protein).replace(',', '.'));
  const carbohydrate = Number(String(fields.carbohydrate).replace(',', '.'));
  const fat = Number(String(fields.fat).replace(',', '.'));

  if (![calories, protein, carbohydrate, fat].every((n) => Number.isFinite(n))) {
    throw new Error('칼로리·단백질·탄수·지방을 숫자로 입력해 주세요.');
  }
  if (calories < 0 || protein < 0 || carbohydrate < 0 || fat < 0) {
    throw new Error('영양 값은 0 이상이어야 합니다.');
  }
  return { calories, protein, carbohydrate, fat };
}
