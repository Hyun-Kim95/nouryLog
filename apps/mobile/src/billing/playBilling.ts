import { Platform } from 'react-native';
import {
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  isUserCancelledError,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type ProductSubscription,
  type Purchase,
} from 'react-native-iap';
import { PREMIUM_SKU } from './constants';

export type PlayPurchasePayload = {
  productId: string;
  purchaseToken: string;
  purchase: Purchase;
};

let connectionReady = false;

function purchaseTokenFrom(purchase: Purchase): string {
  const token = purchase.purchaseToken;
  if (!token) {
    throw new Error('구매 토큰을 받지 못했습니다.');
  }
  return token;
}

function googleSubscriptionOffers(sub: ProductSubscription): { sku: string; offerToken: string }[] | undefined {
  const android = sub.platform === 'android' ? sub.subscriptionOfferDetailsAndroid : undefined;
  if (!android?.length) return undefined;
  const offerToken = android[0]?.offerToken;
  if (!offerToken) return undefined;
  return [{ sku: PREMIUM_SKU, offerToken }];
}

async function ensureBillingConnection(): Promise<ProductSubscription> {
  if (Platform.OS !== 'android') {
    throw new Error('Google Play 결제는 Android 앱에서만 사용할 수 있습니다.');
  }
  if (!connectionReady) {
    await initConnection();
    connectionReady = true;
  }
  const products = await fetchProducts({ skus: [PREMIUM_SKU], type: 'subs' });
  const sub = products?.find((p) => p.id === PREMIUM_SKU) as ProductSubscription | undefined;
  if (!sub) {
    throw new Error(
      '구독 상품을 찾을 수 없습니다. Play Console 에 premium_monthly 가 생성·게시되었는지 확인해 주세요.',
    );
  }
  return sub;
}

/**
 * Google Play 구독 결제 UI → purchaseToken 반환 (서버 검증 전, finishTransaction 하지 않음)
 */
export async function purchasePremiumMonthly(): Promise<PlayPurchasePayload> {
  const sub = await ensureBillingConnection();
  const subscriptionOffers = googleSubscriptionOffers(sub);

  return new Promise((resolve, reject) => {
    const removeListeners = () => {
      updateSub.remove();
      errorSub.remove();
    };

    const updateSub = purchaseUpdatedListener((purchase) => {
      if (purchase.productId !== PREMIUM_SKU) return;
      removeListeners();
      resolve({
        productId: purchase.productId,
        purchaseToken: purchaseTokenFrom(purchase),
        purchase,
      });
    });

    const errorSub = purchaseErrorListener((err) => {
      removeListeners();
      if (isUserCancelledError(err)) {
        reject(new Error('결제가 취소되었습니다.'));
        return;
      }
      reject(new Error(err.message || '결제에 실패했습니다.'));
    });

    void requestPurchase({
      type: 'subs',
      request: {
        apple: { sku: PREMIUM_SKU },
        google: {
          skus: [PREMIUM_SKU],
          ...(subscriptionOffers ? { subscriptionOffers } : {}),
        },
      },
    }).catch((e: unknown) => {
      removeListeners();
      reject(e instanceof Error ? e : new Error('구독 요청에 실패했습니다.'));
    });
  });
}

/** 서버 검증 성공 후 Google Play 트랜잭션 완료 */
export async function finishPremiumPurchase(payload: PlayPurchasePayload): Promise<void> {
  await finishTransaction({
    purchase: payload.purchase,
    isConsumable: false,
  });
}

/** 기기에 남아 있는 구독 구매 목록 (복구용) */
export async function restorePremiumPurchases(): Promise<
  Array<{ productId: string; purchaseToken: string }>
> {
  await ensureBillingConnection();
  const purchases = await getAvailablePurchases();
  return purchases
    .filter((p) => p.productId === PREMIUM_SKU)
    .map((p) => ({
      productId: p.productId,
      purchaseToken: purchaseTokenFrom(p),
    }));
}
