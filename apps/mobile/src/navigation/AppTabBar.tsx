import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomBannerAd } from '../ads/BottomBannerAd';
import { useAdsGate } from '../ads/AdsGateContext';
import { resolveBottomInset } from '../lib/resolveBottomInset';
import { useTheme } from '../theme';

/** 탭 아이콘·라벨 영역 높이(시스템 내비 제외) */
const TAB_BAR_CONTENT_HEIGHT = Platform.OS === 'android' ? 60 : 54;

export function AppTabBar(props: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { showBottomBanner } = useAdsGate();
  const bottomInset = resolveBottomInset(insets.bottom);

  return (
    <View
      style={{
        backgroundColor: t.colors.bg,
        borderTopWidth: 1,
        borderTopColor: t.colors.border,
        paddingBottom: bottomInset,
      }}
    >
      {showBottomBanner ? <BottomBannerAd /> : null}
      <BottomTabBar
        {...props}
        insets={{ top: 0, right: insets.right, bottom: 0, left: insets.left }}
        style={{
          position: 'relative',
          height: TAB_BAR_CONTENT_HEIGHT,
          paddingTop: 8,
          paddingBottom: 0,
          elevation: 0,
        }}
      />
    </View>
  );
}
