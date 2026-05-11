-- CreateEnum
CREATE TYPE "PortionUnit" AS ENUM ('GRAM', 'PIECE', 'PLATE', 'BOWL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MealInputMode" AS ENUM ('PORTION_COUNT', 'TOTAL_GRAMS');

-- AlterTable
ALTER TABLE "FoodTemplate" ADD COLUMN "portionUnit" "PortionUnit" NOT NULL DEFAULT 'GRAM';

-- AlterTable
ALTER TABLE "FoodTemplate" ADD COLUMN "portionLabel" TEXT;

-- AlterTable
ALTER TABLE "Meal" ADD COLUMN "foodTemplateId" TEXT,
ADD COLUMN "mealInputMode" "MealInputMode",
ADD COLUMN "portionQuantity" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Meal_foodTemplateId_idx" ON "Meal"("foodTemplateId");

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_foodTemplateId_fkey" FOREIGN KEY ("foodTemplateId") REFERENCES "FoodTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
