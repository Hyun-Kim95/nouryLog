import { ScrollView, Text, View } from 'react-native';
import type { FulfillmentStatus } from '../lib/goalFulfillment';
import type { Theme } from '../theme';
import { STATS_COPY } from '../copy/stats';
import { useTheme } from '../theme';

type DailyPoint = {
  date: string;
  summary: { calories: number };
  calorieStatus: FulfillmentStatus;
  hasRecords: boolean;
};

type Props = {
  daily: DailyPoint[];
  calorieMin: number | null;
  calorieMax: number | null;
};

function dayLabel(ymd: string): string {
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  return `${Number(parts[1])}/${Number(parts[2])}`;
}

const CHART_HEIGHT = 120;
const BAR_WIDTH = 16;
const COL_WIDTH = 28;

function statusColor(status: FulfillmentStatus, hasRecords: boolean, t: Theme): string {
  if (!hasRecords) return t.colors.border;
  if (status === 'met') return t.colors.primary;
  if (status === 'under' || status === 'over') return t.colors.warn;
  return t.colors.fgMuted;
}

export function CalorieRangeChart({ daily, calorieMin, calorieMax }: Props) {
  const t = useTheme();
  if (daily.length === 0) return null;

  const bandLow = calorieMin ?? calorieMax ?? 0;
  const bandHigh = calorieMax ?? calorieMin ?? bandLow;
  const intakeMax = Math.max(...daily.map((d) => d.summary.calories), bandHigh, 1);
  const scaleMax = intakeMax * 1.1;

  const bandBottom = bandLow > 0 ? (bandLow / scaleMax) * CHART_HEIGHT : 0;
  const bandTop = bandHigh > 0 ? (bandHigh / scaleMax) * CHART_HEIGHT : 0;
  const bandHeight = Math.max(4, bandTop - bandBottom);

  return (
    <View style={{ gap: t.spacing.sm }}>
      <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
        {STATS_COPY.calorieRangeChartTitle}
      </Text>
      {calorieMin != null && calorieMax != null ? (
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
          {STATS_COPY.calorieRangeBand(calorieMin, calorieMax)}
        </Text>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: t.spacing.xs, alignItems: 'flex-end', minHeight: CHART_HEIGHT + 24 }}>
          {daily.map((p) => {
            const barH = p.hasRecords
              ? Math.max(8, (p.summary.calories / scaleMax) * CHART_HEIGHT)
              : 8;
            const color = statusColor(p.calorieStatus, p.hasRecords, t);
            return (
              <View key={p.date} style={{ width: COL_WIDTH, alignItems: 'center' }}>
                <View style={{ height: CHART_HEIGHT, width: COL_WIDTH, justifyContent: 'flex-end', alignItems: 'center' }}>
                  {calorieMin != null && calorieMax != null ? (
                    <View
                      style={{
                        position: 'absolute',
                        bottom: bandBottom,
                        height: bandHeight,
                        width: BAR_WIDTH + 8,
                        borderRadius: 4,
                        backgroundColor: t.colors.primary,
                        opacity: 0.15,
                      }}
                    />
                  ) : null}
                  <View
                    style={{
                      width: BAR_WIDTH,
                      height: barH,
                      borderRadius: 4,
                      backgroundColor: color,
                    }}
                  />
                </View>
                <Text style={{ color: t.colors.fgSubtle, fontSize: 10, marginTop: 4 }}>
                  {dayLabel(p.date)}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>
        {STATS_COPY.calorieRangeLegend}
      </Text>
    </View>
  );
}
