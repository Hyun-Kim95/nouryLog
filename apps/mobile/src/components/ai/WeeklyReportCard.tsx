import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { getWeeklyReport, type WeeklyReportResponse } from '../../api/ai';
import { ApiError } from '../../lib/apiError';
import { AI_COPY } from '../../copy/ai';
import { useTheme } from '../../theme';
import { Banner, Card, CardTitle, Chip, PrimaryButton } from '../ui';

type Props = {
  token: string;
  anchor: string;
  onGoLog: () => void;
};

export function WeeklyReportCard({ token, anchor, onGoLog }: Props) {
  const t = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<WeeklyReportResponse | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getWeeklyReport(token, anchor);
      setReport(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : AI_COPY.weeklyLoadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token, anchor]);

  const empty = report?.sections.overview.mealCount === 0;
  const km = report?.sections.keyMetrics;
  const goals = report?.sections.nextWeekGoals ?? report?.sections.suggestions ?? [];

  return (
    <Card>
      <CardTitle>{AI_COPY.weeklyReportTitle}</CardTitle>
      <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, marginBottom: t.spacing.sm }}>
        {AI_COPY.weeklyReportDesc}
      </Text>

      {loading ? <Text style={{ color: t.colors.fgMuted }}>{AI_COPY.loading}</Text> : null}
      {error ? (
        <Banner variant="danger" actionLabel={AI_COPY.retry} onAction={() => void load()}>
          {error}
        </Banner>
      ) : null}

      {report && empty ? (
        <>
          <Text style={{ color: t.colors.fg }}>{AI_COPY.answerNoMeals}</Text>
          <PrimaryButton title={AI_COPY.emptyWeekCta} onPress={onGoLog} />
        </>
      ) : null}

      {report && !empty && !loading ? (
        <View style={{ gap: t.spacing.md }}>
          {km ? (
            <View style={{ gap: t.spacing.xs }}>
              <Text style={{ color: t.colors.fg, fontWeight: '700' }}>{AI_COPY.weeklyKeySummary}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs }}>
                <Chip label={AI_COPY.weeklyMetricBreakfastSkip(km.breakfastSkipDays)} />
                <Chip label={AI_COPY.weeklyMetricProteinShort(km.proteinShortMeals)} />
                <Chip label={AI_COPY.weeklyMetricOutside(km.outsideMealCount)} />
                <Chip label={AI_COPY.weeklyMetricVeg(km.vegetableMealCount)} />
              </View>
            </View>
          ) : null}

          <View style={{ gap: t.spacing.xs }}>
            <Text style={{ color: t.colors.fg, fontWeight: '700' }}>{AI_COPY.weeklyAiComment}</Text>
            {!report.llm.used ? <Banner variant="info">{AI_COPY.weeklyTemplateNote}</Banner> : null}
            <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, lineHeight: 22 }}>{report.summaryText}</Text>
          </View>

          {report.sections.evidence && report.sections.evidence.length > 0 ? (
            <View style={{ gap: t.spacing.xs }}>
              <Text style={{ color: t.colors.fg, fontWeight: '700' }}>{AI_COPY.weeklyEvidenceTitle}</Text>
              {report.sections.evidence.map((ev, i) => (
                <Text key={`${ev.date}-${i}`} style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>
                  · {ev.date} {ev.slot}: {ev.foodName}
                </Text>
              ))}
            </View>
          ) : null}

          {goals.length > 0 ? (
            <View style={{ gap: t.spacing.xs }}>
              <Text style={{ color: t.colors.fg, fontWeight: '700' }}>{AI_COPY.weeklyGoalsTitle}</Text>
              {goals.map((g) => (
                <Text key={g} style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>
                  · {g}
                </Text>
              ))}
            </View>
          ) : null}

          {report.disclaimer ? (
            <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>{report.disclaimer}</Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
