-- CreateTable
CREATE TABLE "NutritionFood" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "category" TEXT,
    "per100gCalories" DOUBLE PRECISION NOT NULL,
    "per100gProtein" DOUBLE PRECISION NOT NULL,
    "per100gFat" DOUBLE PRECISION NOT NULL,
    "per100gCarbohydrate" DOUBLE PRECISION NOT NULL,
    "defaultServingGrams" DOUBLE PRECISION,
    "sourceVersion" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deactivatedAt" TIMESTAMP(3),
    "rawPayload" JSONB,

    CONSTRAINT "NutritionFood_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NutritionFood_active_nameNormalized_idx" ON "NutritionFood"("active", "nameNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionFood_source_externalId_key" ON "NutritionFood"("source", "externalId");
