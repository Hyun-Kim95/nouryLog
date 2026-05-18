-- 주류 템플릿 2종: 이름이 없을 때만 INSERT
INSERT INTO "FoodTemplate" (
  "id", "name", "memo", "category", "portionUnit", "portionLabel",
  "referenceAmount", "servingGrams", "calories", "protein", "fat", "carbohydrate", "active"
)
SELECT gen_random_uuid()::text, '소주', '참이슬 등 360ml 1병(근사)', '주류', 'PIECE', '병', 1, 360, 540, 0, 0, 0, true
WHERE NOT EXISTS (SELECT 1 FROM "FoodTemplate" WHERE "name" = '소주');

INSERT INTO "FoodTemplate" (
  "id", "name", "memo", "category", "portionUnit", "portionLabel",
  "referenceAmount", "servingGrams", "calories", "protein", "fat", "carbohydrate", "active"
)
SELECT gen_random_uuid()::text, '맥주', '일반 맥주 500ml 1병(근사)', '주류', 'PIECE', '병', 1, 500, 225, 2, 0, 18, true
WHERE NOT EXISTS (SELECT 1 FROM "FoodTemplate" WHERE "name" = '맥주');
