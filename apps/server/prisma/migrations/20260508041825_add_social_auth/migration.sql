-- CreateEnum
CREATE TYPE "SocialProvider" AS ENUM ('NAVER', 'GOOGLE', 'KAKAO');

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "provider" "SocialProvider" NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "email" TEXT,
    "userId" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialAccount_userId_idx" ON "SocialAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_provider_providerUserId_key" ON "SocialAccount"("provider", "providerUserId");

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
