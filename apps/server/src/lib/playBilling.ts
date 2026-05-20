import { google } from 'googleapis';

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

function loadServiceAccountJson(raw: string): object {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is empty');
  }
  try {
    if (trimmed.startsWith('{')) {
      return JSON.parse(trimmed) as object;
    }
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
    return JSON.parse(decoded) as object;
  } catch {
    throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON must be JSON or base64-encoded JSON');
  }
}

export function getPlayBillingConfig(): PlayBillingConfig | null {
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME?.trim() || 'com.nourylog.app';
  const subscriptionId =
    process.env.GOOGLE_PLAY_SUBSCRIPTION_ID?.trim() || 'premium_monthly';
  const serviceAccountJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?.trim() ?? '';
  if (!serviceAccountJson) return null;
  return { packageName, subscriptionId, serviceAccountJson };
}

export function isPlayBillingConfigured(): boolean {
  return getPlayBillingConfig() !== null;
}

export function isPlayBillingSkipVerify(): boolean {
  return process.env.BILLING_SKIP_VERIFY === '1';
}

function createAndroidPublisher(config: PlayBillingConfig) {
  const credentials = loadServiceAccountJson(config.serviceAccountJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  return google.androidpublisher({ version: 'v3', auth });
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

  const androidPublisher = createAndroidPublisher(config);
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

  const androidPublisher = createAndroidPublisher(config);
  await androidPublisher.purchases.subscriptions.acknowledge({
    packageName: config.packageName,
    subscriptionId: productId,
    token: purchaseToken,
  });
}
