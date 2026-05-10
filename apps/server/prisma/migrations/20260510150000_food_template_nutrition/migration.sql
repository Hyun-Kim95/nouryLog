-- 음식 템플릿 영양값: 기준 분량(g) + 칼로리/단백/지방/탄수.
-- 신규/수정 시 라우트에서 필수, 기존 행은 NULL 허용으로 두고 점진 채움.
ALTER TABLE "FoodTemplate" ADD COLUMN IF NOT EXISTS "servingGrams" DOUBLE PRECISION;
ALTER TABLE "FoodTemplate" ADD COLUMN IF NOT EXISTS "calories" DOUBLE PRECISION;
ALTER TABLE "FoodTemplate" ADD COLUMN IF NOT EXISTS "protein" DOUBLE PRECISION;
ALTER TABLE "FoodTemplate" ADD COLUMN IF NOT EXISTS "fat" DOUBLE PRECISION;
ALTER TABLE "FoodTemplate" ADD COLUMN IF NOT EXISTS "carbohydrate" DOUBLE PRECISION;
