import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import {
  acknowledgePlaySubscription,
  getPlayBillingConfig,
  isPlayBillingConfigured,
  isPlayBillingSkipVerify,
  isSubscriptionActive,
  verifyPlaySubscription,
  type PlaySubscriptionVerification,
} from './playBilling.js';

const PREMIUM_PRODUCT = 'premium_monthly';

export type BillingCheckoutBody = {
  productType?: string;
  purchaseToken?: string;
  packageName?: string;
};

export type BillingRestorePurchase = {
  productId: string;
  purchaseToken: string;
};

export type BillingRestoreBody = {
  purchases?: BillingRestorePurchase[];
};

async function upsertPremiumEntitlements(userId: string, active: boolean) {
  await prisma.billing.upsert({
    where: { userId },
    create: {
      userId,
      ocrPaidEnabled: active,
      adFreeEnabled: active,
    },
    update: {
      ocrPaidEnabled: active,
      adFreeEnabled: active,
    },
  });
}

async function persistPurchaseRecord(
  userId: string,
  verification: PlaySubscriptionVerification,
  tx?: Prisma.TransactionClient,
) {
  const db = tx ?? prisma;
  const existing = await db.playSubscriptionPurchase.findUnique({
    where: { purchaseToken: verification.purchaseToken },
  });
  if (existing && existing.userId !== userId) {
    throw new Error('PURCHASE_TOKEN_OWNED_BY_OTHER_USER');
  }

  const acknowledgedAt = verification.acknowledged ? new Date() : null;
  await db.playSubscriptionPurchase.upsert({
    where: { purchaseToken: verification.purchaseToken },
    create: {
      userId,
      purchaseToken: verification.purchaseToken,
      productId: verification.productId,
      expiryTime: verification.expiryTime,
      acknowledgedAt,
    },
    update: {
      userId,
      productId: verification.productId,
      expiryTime: verification.expiryTime,
      acknowledgedAt: acknowledgedAt ?? undefined,
    },
  });
}

async function applyVerifiedSubscription(userId: string, verification: PlaySubscriptionVerification) {
  const active = isSubscriptionActive(verification);
  await persistPurchaseRecord(userId, verification);
  await upsertPremiumEntitlements(userId, active);

  if (active && !verification.acknowledged) {
    await acknowledgePlaySubscription(verification.purchaseToken, verification.productId);
    await prisma.playSubscriptionPurchase.update({
      where: { purchaseToken: verification.purchaseToken },
      data: { acknowledgedAt: new Date() },
    });
  }
}

export async function processBillingCheckout(userId: string, body: BillingCheckoutBody): Promise<void> {
  const productType = typeof body.productType === 'string' ? body.productType.trim() : '';
  if (productType !== PREMIUM_PRODUCT) {
    throw new Error('INVALID_PRODUCT_TYPE');
  }

  const purchaseToken = typeof body.purchaseToken === 'string' ? body.purchaseToken.trim() : '';
  const config = getPlayBillingConfig();
  const skipVerify = isPlayBillingSkipVerify();

  if (!purchaseToken) {
    if (skipVerify && process.env.NODE_ENV !== 'production') {
      await upsertPremiumEntitlements(userId, true);
      return;
    }
    throw new Error('PURCHASE_TOKEN_REQUIRED');
  }

  if (!config) {
    if (skipVerify && process.env.NODE_ENV !== 'production') {
      await upsertPremiumEntitlements(userId, true);
      return;
    }
    throw new Error('PLAY_BILLING_NOT_CONFIGURED');
  }

  const packageName = typeof body.packageName === 'string' ? body.packageName.trim() : '';
  if (packageName && packageName !== config.packageName) {
    throw new Error('PACKAGE_NAME_MISMATCH');
  }

  const verification = await verifyPlaySubscription(purchaseToken, PREMIUM_PRODUCT);
  await applyVerifiedSubscription(userId, verification);
}

export async function processBillingRestore(userId: string, body: BillingRestoreBody): Promise<void> {
  const purchases = Array.isArray(body.purchases) ? body.purchases : [];
  const config = getPlayBillingConfig();
  const skipVerify = isPlayBillingSkipVerify();

  if (purchases.length === 0) {
    if (skipVerify && process.env.NODE_ENV !== 'production') {
      return;
    }
    if (!isPlayBillingConfigured()) {
      throw new Error('PLAY_BILLING_NOT_CONFIGURED');
    }
    await upsertPremiumEntitlements(userId, false);
    return;
  }

  if (!config && !(skipVerify && process.env.NODE_ENV !== 'production')) {
    throw new Error('PLAY_BILLING_NOT_CONFIGURED');
  }

  let anyActive = false;
  for (const p of purchases) {
    const productId = typeof p.productId === 'string' ? p.productId.trim() : '';
    const purchaseToken = typeof p.purchaseToken === 'string' ? p.purchaseToken.trim() : '';
    if (!productId || !purchaseToken) continue;
    if (productId !== PREMIUM_PRODUCT) continue;

    if (!config && skipVerify && process.env.NODE_ENV !== 'production') {
      anyActive = true;
      continue;
    }

    const verification = await verifyPlaySubscription(purchaseToken, productId);
    await persistPurchaseRecord(userId, verification);
    if (isSubscriptionActive(verification)) {
      anyActive = true;
      if (!verification.acknowledged) {
        await acknowledgePlaySubscription(purchaseToken, productId);
      }
    }
  }

  await upsertPremiumEntitlements(userId, anyActive);
}
