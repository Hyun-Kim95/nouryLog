import { Platform } from 'react-native';

const ANDROID_MIN_BOTTOM_INSET = 28;
const IOS_MIN_BOTTOM_INSET = 8;

/** edge-to-edge Android 에서 insets.bottom 이 0 인 경우 시스템 내비 여백 보정 */
export function resolveBottomInset(insetsBottom: number): number {
  if (Platform.OS === 'android') {
    return Math.max(insetsBottom, ANDROID_MIN_BOTTOM_INSET);
  }
  return Math.max(insetsBottom, IOS_MIN_BOTTOM_INSET);
}
