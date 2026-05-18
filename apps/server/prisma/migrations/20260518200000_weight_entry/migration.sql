-- CreateTable
CREATE TABLE "WeightEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "goal" TEXT,
    "activityLevel" TEXT,
    "proteinGoalG" INTEGER,
    "calorieGoalKcal" INTEGER,
    "proteinGoalMinG" INTEGER,
    "proteinGoalMaxG" INTEGER,
    "calorieGoalMinKcal" INTEGER,
    "calorieGoalMaxKcal" INTEGER,

    CONSTRAINT "WeightEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeightEntry_userId_recordedAt_idx" ON "WeightEntry"("userId", "recordedAt");

-- AddForeignKey
ALTER TABLE "WeightEntry" ADD CONSTRAINT "WeightEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
