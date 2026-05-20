import { useCallback, useEffect, useState } from 'react';
import { StatsCalendarModal } from '../components/StatsCalendarModal';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Segmented } from '../components/Segmented';
import { StatsPeriodNavigator } from '../components/StatsPeriodNavigator';
import { CalorieRangeChart } from '../components/CalorieRangeChart';
import { Banner, Card, CardTitle, ScreenLayout, TextButton } from '../components/ui';
import type { RootStackParamList } from '../navigation';
import { STATS_COPY } from '../copy/stats';
import { fetchStats, type StatsResponse } from '../api/stats';
import { isAuthDenied } from '../api';
import { ensureAccessToken } from '../authSession';
import { useFocusReload } from '../hooks/useFocusReload';
import { mealSlotLabel, type MealSlot } from '../lib/mealSlot';
import { periodOffsetForKstDate, shiftAnchor, todayAnchorKst, type StatsRange } from '../lib/statsPeriod';
import { fetchTodayGoals } from '../lib/todayNutrition';
import { useTheme } from '../theme';

const SLOT_ORDER: Array<MealSlot | 'UNSPECIFIED'> = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'UNSPECIFIED'];

export function StatsScreen() {
  const t = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [range, setRange] = useState<StatsRange>('day');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [data, setData] = useState<StatsResponse | null>(null);
  const [goals, setGoals] = useState<Awaited<ReturnType<typeof fetchTodayGoals>> | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const load = useCallback(
    async ({ silent }: { silent: boolean }) => {
      if (!silent) setLoading(true);
      setErr(null);
      try {
        const token = await ensureAccessToken();
        if (!token) return;
        const anchor = shiftAnchor(todayAnchorKst(), range, periodOffset);
        const [statsR, goalsR] = await Promise.allSettled([
          fetchStats(token, range, anchor),
          fetchTodayGoals(token),
        ]);
        if (statsR.status === 'rejected' && isAuthDenied(statsR.reason)) return;
        if (goalsR.status === 'rejected' && isAuthDenied(goalsR.reason)) return;
        if (statsR.status === 'fulfilled') setData(statsR.value);
        if (goalsR.status === 'fulfilled') setGoals(goalsR.value);
        if (statsR.status === 'rejected' && goalsR.status === 'rejected') {
          throw statsR.reason;
        }
      } catch (e) {
        if (isAuthDenied(e)) return;
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

  const isPeriodAverage = data?.aggregation === 'dailyAverage';
  const recordedDays = data?.periodMeta?.recordedDays ?? 0;
  const empty =
    data &&
    (isPeriodAverage
      ? recordedDays === 0
      : data.summary.calories === 0 &&
        data.summary.protein === 0 &&
        data.summary.carbohydrate === 0 &&
        data.summary.fat === 0);

  const periodLabel = data?.period.label ?? '…';
  const canGoNext = periodOffset < 0;

  const bySlotRows =
    data?.byMealSlot &&
    SLOT_ORDER.map((slot) => {
      const key = slot;
      const sum = data.byMealSlot![key];
      if (!sum || (sum.calories === 0 && sum.protein === 0)) return null;
      const label = slot === 'UNSPECIFIED' ? '미분류' : mealSlotLabel(slot);
      return { key, label, sum };
    }).filter(Boolean) as Array<{ key: string; label: string; sum: { calories: number; protein: number } }>;

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
            <CardTitle>
              {isPeriodAverage && recordedDays > 0
                ? STATS_COPY.summaryTitleAverage(recordedDays)
                : STATS_COPY.summaryTitle}
            </CardTitle>
            <Text style={{ color: t.colors.fg, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>
              {Math.round(data.summary.calories)} kcal
            </Text>
            <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>
              단백질 {data.summary.protein}g · 탄수 {data.summary.carbohydrate}g · 지방 {data.summary.fat}g
            </Text>
          </Card>

          {bySlotRows && bySlotRows.length > 0 ? (
            <Card>
              <CardTitle>
                {isPeriodAverage ? STATS_COPY.bySlotTitleAverage : STATS_COPY.bySlotTitle}
              </CardTitle>
              {bySlotRows.map((row) => (
                <Text
                  key={row.key}
                  style={{ color: t.colors.fg, fontSize: t.fontSize.body, marginBottom: t.spacing.xs }}
                >
                  {STATS_COPY.slotLine(row.label, Math.round(row.sum.calories), Math.round(row.sum.protein))}
                </Text>
              ))}
            </Card>
          ) : null}

          {data.daily && data.daily.length > 0 ? (
            <Card>
              <CalorieRangeChart
                daily={data.daily.map((d) => ({
                  date: d.date,
                  label: d.label,
                  summary: d.summary,
                  calorieStatus: d.calorieStatus,
                  hasRecords: d.hasRecords,
                }))}
                calorieMin={goals?.calorieGoalMinKcal ?? null}
                calorieMax={goals?.calorieGoalMaxKcal ?? null}
                proteinGoalMinG={goals?.proteinGoalMinG ?? null}
                proteinGoalMaxG={goals?.proteinGoalMaxG ?? goals?.proteinGoalG ?? null}
                chartTapHint={
                  range === 'day' ? STATS_COPY.calorieChartTapHint : STATS_COPY.calorieChartTapHintWeekMonth
                }
              />
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
    <ScreenLayout
      title={STATS_COPY.title}
      loading={loading}
      headerRight={
        <TextButton
          title={STATS_COPY.weightHistoryCta}
          variant="info"
          onPress={() => navigation.navigate('WeightHistory')}
        />
      }
    >
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
          onOpenCalendar={() => setCalendarOpen(true)}
        >
          {statsBody}
        </StatsPeriodNavigator>
      ) : null}

      <StatsCalendarModal
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        onSelectYmd={(ymd) => {
          const today = todayAnchorKst();
          if (ymd > today) return;
          setPeriodOffset(periodOffsetForKstDate(range, ymd, today));
        }}
      />
    </ScreenLayout>
  );
}
