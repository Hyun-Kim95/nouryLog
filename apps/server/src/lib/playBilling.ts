import {
  createAndroidPublisher,
  getPlayPackageName,
  getPlayServiceAccountJson,
  isPlayServiceAccountConfigured,
} from './playAndroidPublisher.js';

export type PlaySubscriptionVerification = {
  productId: string;
  purchaseToken: string;
  expiryTime: Date | null;
  acknowledged: boolean;
  paymentState: number | null;
};

export type PlayBillingConfig = {
  packageName: string;
  subscriptionId: string;
  serviceAccountJson: string;
};

export function getPlayBillingConfig(): PlayBillingConfig | null {
  const serviceAccountJson = getPlayServiceAccountJson();
  if (!serviceAccountJson) return null;
  const packageName = getPlayPackageName();
  const subscriptionId =
    process.env.GOOGLE_PLAY_SUBSCRIPTION_ID?.trim() || 'premium_monthly';
  return { packageName, subscriptionId, serviceAccountJson };
}

export function isPlayBillingConfigured(): boolean {
  return isPlayServiceAccountConfigured();
}

export function isPlayBillingSkipVerify(): boolean {
  return process.env.BILLING_SKIP_VERIFY === '1';
}

/** Google Play 구독이 활성(미만료·결제 유효)인지 판단 */
export function isSubscriptionActive(verification: PlaySubscriptionVerification): boolean {
  if (verification.expiryTime && verification.expiryTime.getTime() > Date.now()) {
    return true;
  }
  return false;
}

export async function verifyPlaySubscription(
  purchaseToken: string,
  productId: string,
): Promise<PlaySubscriptionVerification> {
  const config = getPlayBillingConfig();
  if (!config) {
    throw new Error('PLAY_BILLING_NOT_CONFIGURED');
  }
  if (productId !== config.subscriptionId) {
    throw new Error('PRODUCT_ID_MISMATCH');
  }

  const androidPublisher = createAndroidPublisher(config.serviceAccountJson);
  const { data } = await androidPublisher.purchases.subscriptions.get({
    packageName: config.packageName,
    subscriptionId: productId,
    token: purchaseToken,
  });

  const expiryMs = data.expiryTimeMillis ? Number(data.expiryTimeMillis) : 0;
  const expiryTime = expiryMs > 0 ? new Date(expiryMs) : null;

  return {
    productId,
    purchaseToken,
    expiryTime,
    acknowledged: data.acknowledgementState === 1,
    paymentState: data.paymentState ?? null,
  };
}

export async function acknowledgePlaySubscription(
  purchaseToken: string,
  productId: string,
): Promise<void> {
  const config = getPlayBillingConfig();
  if (!config) return;

  const androidPublisher = createAndroidPublisher(config.serviceAccountJson);
  await androidPublisher.purchases.subscriptions.acknowledge({
    packageName: config.packageName,
    subscriptionId: productId,
    token: purchaseToken,
  });
}
