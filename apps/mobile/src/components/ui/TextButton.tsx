import { Pressable, Text } from 'react-native';
import { useTheme } from '../../theme';

export function TextButton({
  title,
  onPress,
  variant = 'default',
}: {
  title: string;
  onPress: () => void;
  variant?: 'default' | 'danger' | 'info';
}) {
  const t = useTheme();
  const color =
    variant === 'danger' ? t.colors.danger : variant === 'info' ? t.colors.info : t.colors.fgMuted;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
      <Text style={{ color, fontWeight: '700', fontSize: t.fontSize.body }}>{title}</Text>
    </Pressable>
  );
}
