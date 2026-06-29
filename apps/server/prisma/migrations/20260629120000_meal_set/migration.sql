-- CreateTable
CREATE TABLE "MealSet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultMealSlot" "MealSlot" NOT NULL,
    "defaultSnackPlacement" "SnackPlacement",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealSetItem" (
    "id" TEXT NOT NULL,
    "mealSetId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'template',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "foodTemplateId" TEXT,
    "mealInputMode" "MealInputMode",
    "portionQuantity" DOUBLE PRECISION,
    "totalGrams" DOUBLE PRECISION,
    "name" TEXT,
    "calories" DOUBLE PRECISION,
    "protein" DOUBLE PRECISION,
    "carbohydrate" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "grams" DOUBLE PRECISION,

    CONSTRAINT "MealSetItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MealSet_userId_active_idx" ON "MealSet"("userId", "active");

-- CreateIndex
CREATE INDEX "MealSetItem_mealSetId_idx" ON "MealSetItem"("mealSetId");

-- CreateIndex
CREATE INDEX "MealSetItem_foodTemplateId_idx" ON "MealSetItem"("foodTemplateId");

-- AddForeignKey
ALTER TABLE "MealSet" ADD CONSTRAINT "MealSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealSetItem" ADD CONSTRAINT "MealSetItem_mealSetId_fkey" FOREIGN KEY ("mealSetId") REFERENCES "MealSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealSetItem" ADD CONSTRAINT "MealSetItem_foodTemplateId_fkey" FOREIGN KEY ("foodTemplateId") REFERENCES "FoodTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
