import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Segmented } from '../components/Segmented';
import { StatsPeriodNavigator } from '../components/StatsPeriodNavigator';
import { Banner, Card, CardTitle, ProgressBar, ScreenLayout } from '../components/ui';
import { STATS_COPY } from '../copy/stats';
import { apiFetch } from '../api';
import { getAccessToken } from '../authStorage';
import { useFocusReload } from '../hooks/useFocusReload';
import { computeFulfillment } from '../lib/goalFulfillment';
import { shiftAnchor, todayAnchorKst, type StatsRange } from '../lib/statsPeriod';
import { fetchTodayGoals } from '../lib/todayNutrition';
import { useTheme } from '../theme';

type Stats = {
  aggregatedAt: string;
  isStale: boolean;
  staleHours: number;
  timezone: string;
  period: {
    anchor: string;
    from: string;
    toExclusive: string;
    label: string;
  };
  summary: { calories: number; protein: number; carbohydrate: number; fat: number };
};

export function StatsScreen() {
  const t = useTheme();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [range, setRange] = useState<StatsRange>('day');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [data, setData] = useState<Stats | null>(null);
  const [goals, setGoals] = useState<Awaited<ReturnType<typeof fetchTodayGoals>> | null>(null);

  const load = useCallback(
    async ({ silent }: { silent: boolean }) => {
      if (!silent) setLoading(true);
      setErr(null);
      try {
        const token = await getAccessToken();
        if (!token) throw new Error('로그인 필요');
        const anchor = shiftAnchor(todayAnchorKst(), range, periodOffset);
        const [s, g] = await Promise.all([
          apiFetch<Stats>(`/stats?range=${range}&anchor=${encodeURIComponent(anchor)}`, { token }),
          fetchTodayGoals(token),
        ]);
        setData(s);
        setGoals(g);
      } catch (e) {
        const msg = e instanceof Error ? e.message : STATS_COPY.loadError;
        if (msg.includes('미래') || msg.includes('anchor')) {
          setErr(STATS_COPY.periodFutureBlocked);
        } else {
          setErr(msg);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [range, periodOffset],
  );

  useFocusReload(load);

  useEffect(() => {
    void load({ silent: periodOffset !== 0 });
  }, [range, periodOffset, load]);

  const handleRangeChange = (next: StatsRange) => {
    setRange(next);
    setPeriodOffset(0);
  };

  const goPrev = () => setPeriodOffset((o) => o - 1);
  const goNext = () => {
    if (periodOffset < 0) setPeriodOffset((o) => o + 1);
  };

  const empty =
    data &&
    data.summary.calories === 0 &&
    data.summary.protein === 0 &&
    data.summary.carbohydrate === 0 &&
    data.summary.fat === 0;

  const profile = goals?.profile;
  const proteinGoalG = goals?.proteinGoalG ?? null;
  const calorieGoalKcal = goals?.calorieGoalKcal ?? null;
  const periodLabel = data?.period.label ?? '…';
  const canGoNext = periodOffset < 0;

  const statsBody = (
    <>
      {err ? (
        <Banner variant="danger" actionLabel={STATS_COPY.retry} onAction={() => void load({ silent: false })}>
          {err}
        </Banner>
      ) : null}

      {data?.isStale ? (
        <Banner variant="warn">{STATS_COPY.staleBanner(data.staleHours)}</Banner>
      ) : null}

      {data && !empty ? (
        <>
          <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>
            {STATS_COPY.aggregatedAt(data.aggregatedAt, data.timezone)}
          </Text>
          <Card>
            <CardTitle>{STATS_COPY.summaryTitle}</CardTitle>
            <Text style={{ color: t.colors.fg, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>
              {data.summary.calories} kcal
            </Text>
            <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>
              단백질 {data.summary.protein}g · 탄수 {data.summary.carbohydrate}g · 지방 {data.summary.fat}g
            </Text>
          </Card>
          {(proteinGoalG != null || calorieGoalKcal != null) && range === 'day' ? (
            <Card>
              <CardTitle>{STATS_COPY.fulfillmentTitle}</CardTitle>
              {calorieGoalKcal != null ? (
                <ProgressBar
                  label="칼로리"
                  value={data.summary.calories}
                  max={calorieGoalKcal}
                  unit=" kcal"
                  fulfillment={computeFulfillment(
                    'calorie',
                    data.summary.calories,
                    calorieGoalKcal,
                    profile,
                  )}
                />
              ) : null}
              {proteinGoalG != null ? (
                <ProgressBar
                  label="단백질"
                  value={data.summary.protein}
                  max={proteinGoalG}
                  unit="g"
                  fulfillment={computeFulfillment('protein', data.summary.protein, proteinGoalG, profile)}
                />
              ) : null}
            </Card>
          ) : null}
        </>
      ) : null}

      {data && empty && !err ? (
        <Card>
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>{STATS_COPY.empty}</Text>
          <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>{STATS_COPY.emptyCta}</Text>
        </Card>
      ) : null}
    </>
  );

  return (
    <ScreenLayout title={STATS_COPY.title} loading={loading}>
      <Segmented<StatsRange>
        options={[
          { value: 'day', label: STATS_COPY.rangeDay },
          { value: 'week', label: STATS_COPY.rangeWeek },
          { value: 'month', label: STATS_COPY.rangeMonth },
        ]}
        value={range}
        onChange={handleRangeChange}
      />

      {!loading ? (
        <StatsPeriodNavigator
          label={periodLabel}
          canGoPrev
          canGoNext={canGoNext}
          onPrev={goPrev}
          onNext={goNext}
          swipeEnabled={!err}
        >
          {statsBody}
        </StatsPeriodNavigator>
      ) : null}
    </ScreenLayout>
  );
}
