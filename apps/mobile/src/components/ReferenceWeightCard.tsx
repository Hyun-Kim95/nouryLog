import { ActivityIndicator, Text, View } from 'react-native';
import type { ReferenceWeightResponse } from '../api/referenceWeight';
import { WEIGHT_COPY } from '../copy/weight';
import { sortedWarnings, WARNING_COPY } from '../copy/recommendation';
import { Banner } from './ui';
import { useTheme } from '../theme';

function goalHint(data: ReferenceWeightResponse): string | null {
  if (data.warnings.includes('teen_caution')) return WEIGHT_COPY.hintTeen;
  if (!data.suggestedGoal) return null;
  if (data.suggestedGoal === 'lose') return WEIGHT_COPY.hintLose;
  if (data.suggestedGoal === 'gain') return WEIGHT_COPY.hintGain;
  return WEIGHT_COPY.hintMaintain;
}

type Props = {
  data: ReferenceWeightResponse | null;
  loading?: boolean;
  error?: string | null;
};

export function ReferenceWeightCard({ data, loading, error }: Props) {
  const t = useTheme();

  if (loading) {
    return (
      <View
        style={{
          padding: t.spacing.md,
          borderRadius: t.radius.md,
          backgroundColor: t.colors.surface2,
          borderWidth: 1,
          borderColor: t.colors.border,
          alignItems: 'center',
        }}
      >
        <ActivityIndicator color={t.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <Banner variant="danger">{error}</Banner>
    );
  }

  if (!data) return null;

  const hint = goalHint(data);
  const warnings = sortedWarnings(data.warnings);

  return (
    <View
      style={{
        padding: t.spacing.md,
        borderRadius: t.radius.md,
        backgroundColor: t.colors.surface2,
        borderWidth: 1,
        borderColor: t.colors.border,
        gap: t.spacing.sm,
      }}
    >
      <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '700' }}>
        {WEIGHT_COPY.referenceTitle}
      </Text>
      <Text style={{ color: t.colors.fg, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>
        {WEIGHT_COPY.referenceRange(data.weightKgMin, data.weightKgMax, data.bmiMin, data.bmiMax)}
      </Text>
      {data.currentWeightKg != null && data.currentBmi != null ? (
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>
          {WEIGHT_COPY.referenceCurrent(data.currentWeightKg, data.currentBmi)}
        </Text>
      ) : null}
      {hint ? (
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>{hint}</Text>
      ) : null}
      {warnings.map((code) => (
        <Text key={code} style={{ color: t.colors.warn, fontSize: t.fontSize.caption, fontWeight: '600' }}>
          {WARNING_COPY[code]}
        </Text>
      ))}
      <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>{data.disclaimer}</Text>
    </View>
  );
}

export function canShowReferenceCard(heightCm: number | null | undefined): boolean {
  return heightCm != null && heightCm >= 100 && heightCm <= 250;
}
