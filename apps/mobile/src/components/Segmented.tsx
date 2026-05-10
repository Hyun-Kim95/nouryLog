import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

export type SegmentedProps<T extends string> = {
  label?: string;
  helper?: string;
  error?: string;
  required?: boolean;
  options: SegmentedOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({
  label,
  helper,
  error,
  required,
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  const t = useTheme();

  return (
    <View style={{ gap: t.spacing.xs }}>
      {label ? (
        <Text style={[styles.label, { color: t.colors.fg, fontSize: t.fontSize.body }]}>
          {label}
          {required ? <Text style={{ color: t.colors.danger }}> *</Text> : null}
        </Text>
      ) : null}
      <View
        accessibilityRole="radiogroup"
        style={[
          styles.row,
          {
            borderColor: error ? t.colors.danger : t.colors.border,
            borderRadius: t.radius.md,
            backgroundColor: t.colors.surface,
          },
        ]}
      >
        {options.map((opt, idx) => {
          const selected = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(opt.value)}
              style={[
                styles.cell,
                {
                  backgroundColor: selected ? t.colors.primary : 'transparent',
                  paddingVertical: t.spacing.md,
                  borderLeftWidth: idx === 0 ? 0 : 1,
                  borderLeftColor: t.colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: selected ? t.colors.primaryFg : t.colors.fg,
                  fontWeight: selected ? '700' : '500',
                  fontSize: t.fontSize.body,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={{ color: t.colors.danger, fontSize: t.fontSize.caption }}>
          {error}
        </Text>
      ) : helper ? (
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: '600' },
  row: { flexDirection: 'row', borderWidth: 1, overflow: 'hidden' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
