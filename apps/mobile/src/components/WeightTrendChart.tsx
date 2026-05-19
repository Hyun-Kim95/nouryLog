import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import type { WeightEntryItem } from '../api/weightEntries';
import { WEIGHT_COPY } from '../copy/weight';
import { useTheme } from '../theme';

type Point = {
  id: string;
  date: string;
  weightKg: number;
};

type Props = {
  entries: WeightEntryItem[];
};

const CHART_HEIGHT = 120;
const DAY_LABEL_HEIGHT = 28;
const COL_WIDTH = 48;
const BAR_WIDTH = 10;
const LABEL_GUTTER = 40;

function dayOfMonth(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return d.getDate();
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function valueToHeight(value: number, scaleMax: number): number {
  if (scaleMax <= 0) return 0;
  return Math.max(4, (value / scaleMax) * CHART_HEIGHT);
}

export function WeightTrendChart({ entries }: Props) {
  const t = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chartWidth, setChartWidth] = useState(0);

  const points: Point[] = useMemo(() => {
    const byDate = new Map<string, WeightEntryItem>();
    for (const e of entries) {
      const key = e.recordedAt.slice(0, 10);
      const prev = byDate.get(key);
      if (!prev || new Date(e.recordedAt).getTime() > new Date(prev.recordedAt).getTime()) {
        byDate.set(key, e);
      }
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, e]) => ({ id: e.id, date: e.recordedAt.slice(0, 10), weightKg: e.weightKg }));
  }, [entries]);

  useEffect(() => {
    setSelectedId(null);
  }, [entries]);

  const scaleMax = useMemo(() => {
    if (!points.length) return 1;
    const peak = Math.max(...points.map((p) => p.weightKg), 1);
    return peak * 1.08;
  }, [points]);

  if (!points.length) return null;

  const contentMinWidth = Math.max(
    points.length * COL_WIDTH,
    Math.max(0, windowWidth - t.spacing.lg * 2 - LABEL_GUTTER - 32),
  );

  const selected = points.find((p) => p.id === selectedId) ?? null;
  const plotWidth = chartWidth > 0 ? chartWidth : contentMinWidth;

  const onChartLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setChartWidth(w);
  };

  return (
    <View style={{ gap: t.spacing.sm }}>
      <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
        {WEIGHT_COPY.chartTitle}
      </Text>
      {selected ? (
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, textAlign: 'center' }}>
          {WEIGHT_COPY.chartTooltip(formatDateLabel(selected.date), selected.weightKg)}
        </Text>
      ) : (
        <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption, textAlign: 'center' }}>
          {WEIGHT_COPY.chartTapHint}
        </Text>
      )}
      <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
        <View style={{ minWidth: contentMinWidth }} onLayout={onChartLayout}>
          <View style={{ height: CHART_HEIGHT + DAY_LABEL_HEIGHT, width: plotWidth }}>
            <View style={{ height: CHART_HEIGHT, flexDirection: 'row', alignItems: 'flex-end' }}>
              {points.map((p) => {
                const h = valueToHeight(p.weightKg, scaleMax);
                const isSelected = p.id === selectedId;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setSelectedId(p.id)}
                    style={{
                      width: COL_WIDTH,
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      height: CHART_HEIGHT,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${dayOfMonth(p.date)}일 ${p.weightKg}킬로그램`}
                  >
                    <View
                      style={{
                        width: BAR_WIDTH,
                        height: h,
                        borderRadius: t.radius.sm,
                        backgroundColor: isSelected ? t.colors.primary : t.colors.primary,
                        opacity: isSelected ? 1 : 0.75,
                      }}
                    />
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', marginTop: 4 }}>
              {points.map((p) => (
                <View key={`${p.id}-label`} style={{ width: COL_WIDTH, alignItems: 'center' }}>
                  <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>{dayOfMonth(p.date)}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
