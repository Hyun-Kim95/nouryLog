/** 1차 무료 출시 기본 false. true 시 react-native-iap 플러그인·구매 UI 활성. */
export const isPlayBillingEnabled =
  process.env.EXPO_PUBLIC_PLAY_BILLING_ENABLED === 'true';

export class BillingDisabledError extends Error {
  constructor(message = '프리미엄 구독은 준비 중이에요.') {
    super(message);
    this.name = 'BillingDisabledError';
  }
}
