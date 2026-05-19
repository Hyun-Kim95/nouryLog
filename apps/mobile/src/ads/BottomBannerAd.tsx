import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useTheme } from '../theme';
import { resolveBannerUnitId } from './bannerUnitId';
import { ensureMobileAdsInitialized } from './initMobileAds';

export function BottomBannerAd() {
  const t = useTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    let cancelled = false;
    void ensureMobileAdsInitialized()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((e) => {
        if (__DEV__) console.warn('[BottomBannerAd] init failed', e);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (Platform.OS === 'web' || !ready) {
    return null;
  }

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: t.colors.bg,
        borderTopWidth: 1,
        borderTopColor: t.colors.border,
      }}
    >
      <BannerAd unitId={resolveBannerUnitId()} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}
