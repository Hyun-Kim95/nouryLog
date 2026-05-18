-- 음식 템플릿 3종: 이름이 없을 때만 INSERT (운영자가 admin 에서 수정한 행은 보존)
INSERT INTO "FoodTemplate" (
  "id",
  "name",
  "memo",
  "category",
  "portionUnit",
  "portionLabel",
  "referenceAmount",
  "servingGrams",
  "calories",
  "protein",
  "fat",
  "carbohydrate",
  "active"
)
SELECT
  gen_random_uuid()::text,
  '유개장 컵라면',
  '컵 1개(포장 기준 근사)',
  '간편식',
  'PIECE',
  '개',
  1,
  120,
  530,
  10,
  20,
  78,
  true
WHERE NOT EXISTS (SELECT 1 FROM "FoodTemplate" WHERE "name" = '유개장 컵라면');

INSERT INTO "FoodTemplate" (
  "id",
  "name",
  "memo",
  "category",
  "portionUnit",
  "portionLabel",
  "referenceAmount",
  "servingGrams",
  "calories",
  "protein",
  "fat",
  "carbohydrate",
  "active"
)
SELECT
  gen_random_uuid()::text,
  '제육덮밥',
  '1인분 접시 기준 근사',
  '한식',
  'PLATE',
  '접시',
  1,
  350,
  720,
  32,
  28,
  82,
  true
WHERE NOT EXISTS (SELECT 1 FROM "FoodTemplate" WHERE "name" = '제육덮밥');

INSERT INTO "FoodTemplate" (
  "id",
  "name",
  "memo",
  "category",
  "portionUnit",
  "portionLabel",
  "referenceAmount",
  "servingGrams",
  "calories",
  "protein",
  "fat",
  "carbohydrate",
  "active"
)
SELECT
  gen_random_uuid()::text,
  '순대국',
  '1인분 그릇 기준 근사',
  '한식',
  'BOWL',
  '그릇',
  1,
  500,
  480,
  28,
  18,
  42,
  true
WHERE NOT EXISTS (SELECT 1 FROM "FoodTemplate" WHERE "name" = '순대국');
