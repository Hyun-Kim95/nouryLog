import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../theme';

type Props = TextInputProps & {
  label: string;
};

export function LabeledField({ label, style, ...rest }: Props) {
  const t = useTheme();
  return (
    <View style={{ gap: t.spacing.xs }}>
      <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, fontWeight: '600' }}>{label}</Text>
      <TextInput
        {...rest}
        style={[
          {
            borderWidth: 1,
            borderColor: t.colors.border,
            borderRadius: t.radius.md,
            padding: t.spacing.md,
            color: t.colors.fg,
            backgroundColor: t.colors.surface,
            fontSize: t.fontSize.body,
          },
          style,
        ]}
        placeholderTextColor={t.colors.fgSubtle}
      />
    </View>
  );
}
