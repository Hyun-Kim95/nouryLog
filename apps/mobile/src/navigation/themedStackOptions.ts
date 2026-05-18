import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { Theme } from '../theme';

export function themedStackScreenOptions(t: Theme): NativeStackNavigationOptions {
  return {
    headerStyle: { backgroundColor: t.colors.bg },
    headerTintColor: t.colors.fg,
    headerTitleStyle: { color: t.colors.fg, fontWeight: '600' as const },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: t.colors.bg },
  };
}
