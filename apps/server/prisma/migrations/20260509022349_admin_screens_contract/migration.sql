-- AlterTable
ALTER TABLE "FoodTemplate" ADD COLUMN     "category" TEXT;

-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN     "answer" TEXT,
ADD COLUMN     "answeredAt" TIMESTAMP(3),
ADD COLUMN     "answeredBy" TEXT;

-- CreateIndex
CREATE INDEX "FoodTemplate_category_idx" ON "FoodTemplate"("category");

-- CreateIndex
CREATE INDEX "Inquiry_status_active_idx" ON "Inquiry"("status", "active");
