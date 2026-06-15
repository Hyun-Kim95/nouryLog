import { Pressable, Text, View } from 'react-native';
import type { InsightSummaryResponse } from '../../api/insights';
import { INSIGHT_COPY } from '../../copy/insights';
import { useTheme } from '../../theme';
import { Card, CardTitle, Chip, PrimaryButton } from '../ui';

type Props = {
  summary: InsightSummaryResponse | null;
  loading: boolean;
  error: string | null;
  onPressOpen: () => void;
  onRetry: () => void;
};

export function InsightHomeCard({ summary, loading, error, onPressOpen, onRetry }: Props) {
  const t = useTheme();

  if (loading) {
    return (
      <Card>
        <CardTitle>{INSIGHT_COPY.homeCardTitle}</CardTitle>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>{INSIGHT_COPY.loading}</Text>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardTitle>{INSIGHT_COPY.homeCardTitle}</CardTitle>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body, marginBottom: t.spacing.sm }}>
          {INSIGHT_COPY.homeCardLoadError}
        </Text>
        <PrimaryButton title={INSIGHT_COPY.homeCardRetry} onPress={onRetry} />
      </Card>
    );
  }

  if (!summary) return null;

  const ga = summary.week.goalAchievement;

  return (
    <Pressable onPress={onPressOpen} accessibilityRole="button" accessibilityLabel={INSIGHT_COPY.homeCardOpen}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: t.spacing.sm }}>
          <CardTitle>{INSIGHT_COPY.homeCardTitle}</CardTitle>
          <Text style={{ color: t.colors.primary, fontSize: t.fontSize.caption, fontWeight: '700' }}>
            {INSIGHT_COPY.homeCardOpen}
          </Text>
        </View>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, marginBottom: t.spacing.sm }}>
          {summary.week.period.label} · {INSIGHT_COPY.weekMeta(summary.week.recordedDays, summary.week.mealCount)}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm, marginBottom: t.spacing.sm }}>
          {ga.proteinShortDays > 0 ? (
            <Chip label={INSIGHT_COPY.proteinShortChip(ga.proteinShortDays)} tone="muted" />
          ) : (
            <Chip label={INSIGHT_COPY.proteinOkChip} />
          )}
          {ga.calorieShortDays > 0 ? (
            <Chip label={INSIGHT_COPY.calorieShortChip(ga.calorieShortDays)} tone="muted" />
          ) : null}
        </View>
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, lineHeight: 22 }} numberOfLines={3}>
          {summary.insight.text}
        </Text>
      </Card>
    </Pressable>
  );
}
