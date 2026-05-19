import { Platform } from 'react-native';
import mobileAds from 'react-native-google-mobile-ads';

let initPromise: Promise<void> | null = null;

export function ensureMobileAdsInitialized(): Promise<void> {
  if (Platform.OS === 'web') {
    return Promise.resolve();
  }
  if (!initPromise) {
    initPromise = mobileAds()
      .initialize()
      .then(() => undefined)
      .catch((e) => {
        initPromise = null;
        throw e;
      });
  }
  return initPromise;
}
