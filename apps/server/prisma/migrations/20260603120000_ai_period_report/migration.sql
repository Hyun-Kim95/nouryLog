-- CreateTable
CREATE TABLE "AiPeriodReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "anchor" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPeriodReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiPeriodReport_userId_kind_createdAt_idx" ON "AiPeriodReport"("userId", "kind", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiPeriodReport_userId_kind_anchor_key" ON "AiPeriodReport"("userId", "kind", "anchor");

-- AddForeignKey
ALTER TABLE "AiPeriodReport" ADD CONSTRAINT "AiPeriodReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
