import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

export type RadioOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

export type RadioGroupProps<T extends string> = {
  label?: string;
  helper?: string;
  error?: string;
  required?: boolean;
  options: RadioOption<T>[];
  value: T | null;
  onChange: (next: T | null) => void;
};

export function RadioGroup<T extends string>({
  label,
  helper,
  error,
  required,
  options,
  value,
  onChange,
}: RadioGroupProps<T>) {
  const t = useTheme();

  return (
    <View style={{ gap: t.spacing.xs }}>
      {label ? (
        <Text style={[styles.label, { color: t.colors.fg, fontSize: t.fontSize.body }]}>
          {label}
          {required ? <Text style={{ color: t.colors.danger }}> *</Text> : null}
        </Text>
      ) : null}

      <View accessibilityRole="radiogroup" style={{ gap: t.spacing.sm }}>
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={opt.label}
              accessibilityHint={
                selected ? '한 번 더 탭하면 선택을 취소합니다.' : opt.description ?? undefined
              }
              onPress={() => onChange(selected ? null : opt.value)}
              style={({ pressed }) => [
                styles.card,
                {
                  borderColor: selected ? t.colors.primary : t.colors.border,
                  borderRadius: t.radius.md,
                  backgroundColor: t.colors.surface,
                  paddingVertical: t.spacing.md,
                  paddingHorizontal: t.spacing.md,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.indicator,
                  {
                    backgroundColor: selected ? t.colors.primary : 'transparent',
                  },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: t.colors.fg,
                    fontSize: t.fontSize.body,
                    fontWeight: selected ? '700' : '600',
                  }}
                >
                  {opt.label}
                </Text>
                {opt.description ? (
                  <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, marginTop: 2 }}>
                    {opt.description}
                  </Text>
                ) : null}
              </View>
              <View
                style={[
                  styles.dot,
                  {
                    borderColor: selected ? t.colors.primary : t.colors.border,
                    backgroundColor: selected ? t.colors.primary : 'transparent',
                  },
                ]}
              />
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    gap: 12,
  },
  indicator: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
});
