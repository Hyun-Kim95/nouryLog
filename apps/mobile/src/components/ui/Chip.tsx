import { Text, View } from 'react-native';
import { useTheme } from '../../theme';

export function Chip({ label, tone = 'primary' }: { label: string; tone?: 'primary' | 'muted' }) {
  const t = useTheme();
  const bg = tone === 'primary' ? t.colors.surface2 : t.colors.surface;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: t.spacing.md,
        paddingVertical: t.spacing.xs,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: tone === 'primary' ? t.colors.primary : t.colors.border,
        backgroundColor: bg,
      }}
    >
      <Text
        style={{
          color: tone === 'primary' ? t.colors.primary : t.colors.fgMuted,
          fontSize: t.fontSize.caption,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </View>
  );
}
