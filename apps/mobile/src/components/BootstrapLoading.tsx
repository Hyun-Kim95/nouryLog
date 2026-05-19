import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../theme';

export function BootstrapLoading() {
  const t = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.colors.bg,
      }}
    >
      <ActivityIndicator size="large" color={t.colors.primary} />
    </View>
  );
}
