-- CreateTable
CREATE TABLE "PlaySubscriptionPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purchaseToken" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "expiryTime" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaySubscriptionPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlaySubscriptionPurchase_purchaseToken_key" ON "PlaySubscriptionPurchase"("purchaseToken");

-- CreateIndex
CREATE INDEX "PlaySubscriptionPurchase_userId_idx" ON "PlaySubscriptionPurchase"("userId");

-- AddForeignKey
ALTER TABLE "PlaySubscriptionPurchase" ADD CONSTRAINT "PlaySubscriptionPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
