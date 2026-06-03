import { Text, View } from 'react-native';
import { useTheme } from '../../theme';

export function MacroBarRow({ label, pct }: { label: string; pct: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
      <Text style={{ width: 56, color: t.colors.fg, fontSize: t.fontSize.caption }}>{label}</Text>
      <View
        style={{
          flex: 1,
          height: 8,
          borderRadius: 999,
          backgroundColor: t.colors.border,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.min(100, Math.max(0, pct))}%`,
            height: '100%',
            backgroundColor: t.colors.primary,
          }}
        />
      </View>
      <Text style={{ width: 36, textAlign: 'right', color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
        {pct}%
      </Text>
    </View>
  );
}
