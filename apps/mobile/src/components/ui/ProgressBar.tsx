import { Text, View } from 'react-native';
import type { FulfillmentResult } from '../../lib/goalFulfillment';
import { useTheme } from '../../theme';

export function ProgressBar({
  label,
  value,
  max,
  unit,
  fulfillment,
}: {
  label: string;
  value: number;
  max: number | null;
  unit: string;
  fulfillment?: FulfillmentResult;
}) {
  const t = useTheme();
  const fallbackPct = max != null && max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const barPct = fulfillment?.barPct ?? fallbackPct;
  const barColor = fulfillment?.tone === 'warn' ? t.colors.warn : t.colors.primary;
  const rightLabel =
    fulfillment?.detailLabel ??
    (max != null ? `${value}/${max}${unit} · ${fallbackPct}%` : `${value}${unit}`);

  return (
    <View style={{ gap: t.spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: t.spacing.sm }}>
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, flexShrink: 1, textAlign: 'right' }}>
          {rightLabel}
        </Text>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: t.radius.sm,
          backgroundColor: t.colors.surface2,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${barPct}%`,
            height: '100%',
            backgroundColor: barColor,
            borderRadius: t.radius.sm,
          }}
        />
      </View>
    </View>
  );
}
