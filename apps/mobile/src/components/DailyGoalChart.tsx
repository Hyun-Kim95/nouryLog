import { ScrollView, Text, View } from 'react-native';
import { STATS_COPY } from '../copy/stats';
import { useTheme } from '../theme';

type DailyPoint = {
  date: string;
  goalMet: { calorie: boolean; protein: boolean };
  hasRecords: boolean;
};

function dayLabel(ymd: string): string {
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  return `${Number(parts[1])}/${Number(parts[2])}`;
}

function BarRow({
  label,
  points,
  metric,
}: {
  label: string;
  points: DailyPoint[];
  metric: 'calorie' | 'protein';
}) {
  const t = useTheme();
  return (
    <View style={{ gap: t.spacing.xs }}>
      <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: t.spacing.xs, alignItems: 'flex-end', minHeight: 56 }}>
          {points.map((p) => {
            const met = p.hasRecords && p.goalMet[metric];
            const color = !p.hasRecords
              ? t.colors.border
              : met
                ? t.colors.primary
                : t.colors.warn;
            return (
              <View key={`${p.date}-${metric}`} style={{ alignItems: 'center', width: 28 }}>
                <View
                  style={{
                    width: 16,
                    height: p.hasRecords ? 32 : 12,
                    borderRadius: 4,
                    backgroundColor: color,
                  }}
                />
                <Text style={{ color: t.colors.fgSubtle, fontSize: 10, marginTop: 4 }}>
                  {dayLabel(p.date)}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export function DailyGoalChart({ daily }: { daily: DailyPoint[] }) {
  const t = useTheme();
  if (daily.length === 0) return null;
  return (
    <View style={{ gap: t.spacing.md }}>
      <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
        {STATS_COPY.dailyChartTitle}
      </Text>
      <BarRow label={STATS_COPY.dailyChartCalorie} points={daily} metric="calorie" />
      <BarRow label={STATS_COPY.dailyChartProtein} points={daily} metric="protein" />
      <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>
        {STATS_COPY.dailyMet} / {STATS_COPY.dailyNotMet} / {STATS_COPY.dailyNoRecord}
      </Text>
    </View>
  );
}
