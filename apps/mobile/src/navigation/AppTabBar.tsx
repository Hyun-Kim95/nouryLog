import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomBannerAd } from '../ads/BottomBannerAd';
import { useAdsGate } from '../ads/AdsGateContext';
import { useTheme } from '../theme';

/** 탭 아이콘·라벨 영역 높이(시스템 내비 제외) */
const TAB_BAR_CONTENT_HEIGHT = Platform.OS === 'android' ? 60 : 54;

/**
 * edge-to-edge Android 에서 insets.bottom 이 0 으로 오는 경우가 있어
 * 제스처/3버튼 내비 영역만큼 전체 블록을 위로 올린다.
 */
function resolveBottomInset(insetsBottom: number): number {
  if (Platform.OS === 'android') {
    return Math.max(insetsBottom, 28);
  }
  return Math.max(insetsBottom, 8);
}

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
