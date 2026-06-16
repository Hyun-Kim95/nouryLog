-- AlterTable
ALTER TABLE "Meal" ADD COLUMN "clientRequestId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Meal_userId_clientRequestId_key" ON "Meal"("userId", "clientRequestId");
