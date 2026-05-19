import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

/** 개발·미설정 시 Google 공식 테스트 배너 단위 */
export function resolveBannerUnitId(): string {
  if (__DEV__) {
    return TestIds.ADAPTIVE_BANNER;
  }
  const fromEnv =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS
      : process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID;
  if (fromEnv?.trim()) {
    return fromEnv.trim();
  }
  return TestIds.ADAPTIVE_BANNER;
}
