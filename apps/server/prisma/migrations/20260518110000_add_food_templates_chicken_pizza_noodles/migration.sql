-- 음식 템플릿 4종: 이름이 없을 때만 INSERT
INSERT INTO "FoodTemplate" (
  "id", "name", "memo", "category", "portionUnit", "portionLabel",
  "referenceAmount", "servingGrams", "calories", "protein", "fat", "carbohydrate", "active"
)
SELECT gen_random_uuid()::text, '치킨', '후라이드 1인분(근사)', '외식', 'PLATE', '1인분', 1, 300, 900, 52, 55, 28, true
WHERE NOT EXISTS (SELECT 1 FROM "FoodTemplate" WHERE "name" = '치킨');

INSERT INTO "FoodTemplate" (
  "id", "name", "memo", "category", "portionUnit", "portionLabel",
  "referenceAmount", "servingGrams", "calories", "protein", "fat", "carbohydrate", "active"
)
SELECT gen_random_uuid()::text, '피자', '치즈 피자 1조각(근사)', '외식', 'PIECE', '조각', 1, 120, 285, 12, 11, 32, true
WHERE NOT EXISTS (SELECT 1 FROM "FoodTemplate" WHERE "name" = '피자');

INSERT INTO "FoodTemplate" (
  "id", "name", "memo", "category", "portionUnit", "portionLabel",
  "referenceAmount", "servingGrams", "calories", "protein", "fat", "carbohydrate", "active"
)
SELECT gen_random_uuid()::text, '짜장면', '1인분 그릇 기준 근사', '중식', 'BOWL', '그릇', 1, 500, 680, 18, 22, 98, true
WHERE NOT EXISTS (SELECT 1 FROM "FoodTemplate" WHERE "name" = '짜장면');

INSERT INTO "FoodTemplate" (
  "id", "name", "memo", "category", "portionUnit", "portionLabel",
  "referenceAmount", "servingGrams", "calories", "protein", "fat", "carbohydrate", "active"
)
SELECT gen_random_uuid()::text, '짬뽕', '1인분 그릇 기준 근사', '중식', 'BOWL', '그릇', 1, 500, 620, 24, 18, 78, true
WHERE NOT EXISTS (SELECT 1 FROM "FoodTemplate" WHERE "name" = '짬뽕');
