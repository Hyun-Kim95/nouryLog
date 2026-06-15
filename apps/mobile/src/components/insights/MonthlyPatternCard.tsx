import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { getMonthlyReport, type MonthlyReportResponse } from '../../api/insights';
import { ApiError } from '../../lib/apiError';
import { INSIGHT_COPY } from '../../copy/insights';
import { useTheme } from '../../theme';
import { Banner, Card, CardTitle, Chip } from '../ui';

type Props = {
  token: string;
  anchor: string;
};

export function MonthlyPatternCard({ token, anchor }: Props) {
  const t = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<MonthlyReportResponse | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMonthlyReport(token, anchor);
      setReport(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : INSIGHT_COPY.monthlyLoadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token, anchor]);

  const empty = report?.sections.overview.mealCount === 0;

  return (
    <Card>
      <CardTitle>{INSIGHT_COPY.monthlyPatternTitle}</CardTitle>
      <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, marginBottom: t.spacing.sm }}>
        {INSIGHT_COPY.monthlyPatternDesc}
      </Text>

      {loading ? <Text style={{ color: t.colors.fgMuted }}>{INSIGHT_COPY.loading}</Text> : null}
      {error ? (
        <Banner variant="danger" actionLabel={INSIGHT_COPY.retry} onAction={() => void load()}>
          {error}
        </Banner>
      ) : null}

      {report && empty ? <Text style={{ color: t.colors.fgMuted }}>{INSIGHT_COPY.noMealsInPeriod}</Text> : null}

      {report && !empty && !loading ? (
        <View style={{ gap: t.spacing.md }}>
          {report.sections.recurringPatterns.length > 0 ? (
            <View style={{ gap: t.spacing.xs }}>
              <Text style={{ color: t.colors.fg, fontWeight: '700' }}>{INSIGHT_COPY.monthlyRecurringTitle}</Text>
              {report.sections.recurringPatterns.map((p) => (
                <Text key={p.id} style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>
                  · {p.title}: {p.detail}
                </Text>
              ))}
            </View>
          ) : null}

          {report.sections.improvementTrends.length > 0 ? (
            <View style={{ gap: t.spacing.xs }}>
              <Text style={{ color: t.colors.fg, fontWeight: '700' }}>{INSIGHT_COPY.monthlyTrendTitle}</Text>
              {report.sections.improvementTrends.map((p) => (
                <Text key={p.id} style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>
                  · {p.detail}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={{ gap: t.spacing.xs }}>
            <Text style={{ color: t.colors.fg, fontWeight: '700' }}>{INSIGHT_COPY.monthlyComment}</Text>
            <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, lineHeight: 22 }}>{report.summaryText}</Text>
          </View>

          {report.sections.breakfastSkipByWeekday.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs }}>
              {report.sections.breakfastSkipByWeekday.map((w) => (
                <Chip key={w.weekday} label={`${w.weekday} 아침 결식 ${w.skipDays}일`} />
              ))}
            </View>
          ) : null}

          {report.sections.nextMonthGoals.length > 0 ? (
            <View style={{ gap: t.spacing.xs }}>
              <Text style={{ color: t.colors.fg, fontWeight: '700' }}>{INSIGHT_COPY.monthlyGoalsTitle}</Text>
              {report.sections.nextMonthGoals.map((g) => (
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
