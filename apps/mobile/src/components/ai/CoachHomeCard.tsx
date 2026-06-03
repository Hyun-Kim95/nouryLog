import { Pressable, Text, View } from 'react-native';
import type { CoachSummaryResponse } from '../../api/ai';
import { AI_COPY } from '../../copy/ai';
import { useTheme } from '../../theme';
import { Card, CardTitle, Chip, PrimaryButton } from '../ui';

type Props = {
  summary: CoachSummaryResponse | null;
  loading: boolean;
  error: string | null;
  onPressOpen: () => void;
  onRetry: () => void;
};

export function CoachHomeCard({ summary, loading, error, onPressOpen, onRetry }: Props) {
  const t = useTheme();

  if (loading) {
    return (
      <Card>
        <CardTitle>{AI_COPY.homeCardTitle}</CardTitle>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>{AI_COPY.loading}</Text>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardTitle>{AI_COPY.homeCardTitle}</CardTitle>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body, marginBottom: t.spacing.sm }}>
          {AI_COPY.homeCardLoadError}
        </Text>
        <PrimaryButton title={AI_COPY.homeCardRetry} onPress={onRetry} />
      </Card>
    );
  }

  if (!summary) return null;

  const ga = summary.week.goalAchievement;

  return (
    <Pressable onPress={onPressOpen} accessibilityRole="button" accessibilityLabel={AI_COPY.homeCardOpen}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: t.spacing.sm }}>
          <CardTitle>{AI_COPY.homeCardTitle}</CardTitle>
          <Text style={{ color: t.colors.primary, fontSize: t.fontSize.caption, fontWeight: '700' }}>
            {AI_COPY.homeCardOpen}
          </Text>
        </View>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, marginBottom: t.spacing.sm }}>
          {summary.week.period.label} · {AI_COPY.weekMeta(summary.week.recordedDays, summary.week.mealCount)}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm, marginBottom: t.spacing.sm }}>
          {ga.proteinShortDays > 0 ? (
            <Chip label={AI_COPY.proteinShortChip(ga.proteinShortDays)} tone="muted" />
          ) : (
            <Chip label={AI_COPY.proteinOkChip} />
          )}
          {ga.calorieShortDays > 0 ? <Chip label={AI_COPY.calorieShortChip(ga.calorieShortDays)} tone="muted" /> : null}
        </View>
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, lineHeight: 22 }} numberOfLines={3}>
          {summary.insight.text}
        </Text>
      </Card>
    </Pressable>
  );
}
