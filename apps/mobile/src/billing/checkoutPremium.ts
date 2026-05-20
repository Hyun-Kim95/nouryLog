import { apiFetch } from '../api';
import { ANDROID_PACKAGE, PREMIUM_SKU } from './constants';
import { BillingDisabledError, isPlayBillingEnabled } from './feature';

export async function checkoutPremiumWithPlay(accessToken: string): Promise<void> {
  if (!isPlayBillingEnabled) {
    throw new BillingDisabledError();
  }
  const { finishPremiumPurchase, purchasePremiumMonthly } = await import('./playBilling');
  const purchase = await purchasePremiumMonthly();
  try {
    await apiFetch('/me/billing/checkout', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({
        productType: PREMIUM_SKU,
        purchaseToken: purchase.purchaseToken,
        packageName: ANDROID_PACKAGE,
      }),
    });
    await finishPremiumPurchase(purchase);
  } catch (e) {
    throw e;
  }
}

export async function restorePremiumWithPlay(accessToken: string): Promise<void> {
  if (!isPlayBillingEnabled) {
    throw new BillingDisabledError();
  }
  const { restorePremiumPurchases } = await import('./playBilling');
  const purchases = await restorePremiumPurchases();
  await apiFetch('/me/billing/restore', {
    method: 'POST',
    token: accessToken,
    body: JSON.stringify({ purchases }),
  });
}
