-- AlterTable: 기준 분량 숫자(개수·g 등)
ALTER TABLE "FoodTemplate" ADD COLUMN "referenceAmount" DOUBLE PRECISION NOT NULL DEFAULT 1;

-- 기존 그램 기준 템플릿: 기준 숫자 = 기존 g
UPDATE "FoodTemplate"
SET "referenceAmount" = "servingGrams"
WHERE "portionUnit" = 'GRAM' AND "servingGrams" IS NOT NULL AND "servingGrams" > 0;
