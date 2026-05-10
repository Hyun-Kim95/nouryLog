import { useId } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { useTheme } from '../theme';

export type FieldProps = {
  label: string;
  helper?: string;
  error?: string;
  suffix?: string;
  required?: boolean;
} & Omit<TextInputProps, 'style'>;

export function Field({ label, helper, error, suffix, required, ...inputProps }: FieldProps) {
  const t = useTheme();
  const inputId = useId();
  const borderColor = error ? t.colors.danger : t.colors.border;

  return (
    <View style={[styles.wrap, { gap: t.spacing.xs }]}>
      <Text accessibilityRole="text" style={[styles.label, { color: t.colors.fg, fontSize: t.fontSize.body }]}>
        {label}
        {required ? <Text style={{ color: t.colors.danger }}> *</Text> : null}
      </Text>
      <View
        style={[
          styles.inputRow,
          {
            borderColor,
            borderRadius: t.radius.md,
            backgroundColor: t.colors.surface,
            paddingHorizontal: t.spacing.md,
          },
        ]}
      >
        <TextInput
          {...inputProps}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          nativeID={inputId}
          placeholderTextColor={t.colors.fgSubtle}
          style={[
            styles.input,
            {
              color: t.colors.fg,
              fontSize: t.fontSize.bodyLg,
              paddingVertical: t.spacing.md,
            },
          ]}
        />
        {suffix ? (
          <Text style={[styles.suffix, { color: t.colors.fgMuted, fontSize: t.fontSize.body }]}>{suffix}</Text>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={[styles.helper, { color: t.colors.danger, fontSize: t.fontSize.caption }]}>
          {error}
        </Text>
      ) : helper ? (
        <Text style={[styles.helper, { color: t.colors.fgMuted, fontSize: t.fontSize.caption }]}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  label: { fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  input: { flex: 1 },
  suffix: { marginLeft: 8 },
  helper: {},
});
