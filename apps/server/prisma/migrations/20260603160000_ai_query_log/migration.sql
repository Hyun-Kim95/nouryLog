-- CreateTable
CREATE TABLE "AiQueryLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "usedLlm" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiQueryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiQueryLog_userId_createdAt_idx" ON "AiQueryLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiQueryLog" ADD CONSTRAINT "AiQueryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
