-- CreateTable
CREATE TABLE "OcrFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mealId" TEXT,
    "imageHash" TEXT,
    "rawJson" JSONB NOT NULL,
    "correctedJson" JSONB NOT NULL,
    "changedFields" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OcrFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OcrFeedback_userId_createdAt_idx" ON "OcrFeedback"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "OcrFeedback_userId_mealId_idx" ON "OcrFeedback"("userId", "mealId");

-- AddForeignKey
ALTER TABLE "OcrFeedback" ADD CONSTRAINT "OcrFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrFeedback" ADD CONSTRAINT "OcrFeedback_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
