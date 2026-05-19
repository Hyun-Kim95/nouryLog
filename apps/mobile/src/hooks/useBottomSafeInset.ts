import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resolveBottomInset } from '../lib/resolveBottomInset';

export function useBottomSafeInset(): number {
  const insets = useSafeAreaInsets();
  return resolveBottomInset(insets.bottom);
}
