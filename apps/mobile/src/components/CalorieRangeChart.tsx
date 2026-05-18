import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import type { FulfillmentStatus } from '../lib/goalFulfillment';
import type { Theme } from '../theme';
import { STATS_COPY } from '../copy/stats';
import { useTheme } from '../theme';

type NutritionSum = {
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
};

type DailyPoint = {
  date: string;
  summary: NutritionSum;
  calorieStatus: FulfillmentStatus;
  hasRecords: boolean;
};

type Props = {
  daily: DailyPoint[];
  calorieMin: number | null;
  calorieMax: number | null;
};

const CHART_HEIGHT = 140;
const COL_WIDTH = 36;
const BAR_WIDTH = 20;
const LABEL_GUTTER = 56;
const TOOLTIP_WIDTH = 200;

function dayOfMonth(ymd: string): number {
  const parts = ymd.split('-');
  if (parts.length !== 3) return 0;
  return Number(parts[2]) || 0;
}

function formatTooltipDate(ymd: string): string {
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'] as const;
  return `${Number(parts[1])}월 ${Number(parts[2])}일 (${weekdays[d.getDay()]})`;
}

function statusLabel(status: FulfillmentStatus, hasRecords: boolean): string {
  if (!hasRecords) return STATS_COPY.calorieStatusNone;
  if (status === 'under') return STATS_COPY.calorieStatusUnder;
  if (status === 'over') return STATS_COPY.calorieStatusOver;
  if (status === 'met') return STATS_COPY.calorieStatusMet;
  return STATS_COPY.calorieStatusNone;
}

function statusColor(status: FulfillmentStatus, hasRecords: boolean, t: Theme): string {
  if (!hasRecords) return t.colors.border;
  if (status === 'met') return t.colors.primary;
  if (status === 'under' || status === 'over') return t.colors.warn;
  return t.colors.fgMuted;
}

function valueToHeight(value: number, scaleMax: number): number {
  if (scaleMax <= 0) return 0;
  return Math.max(0, (value / scaleMax) * CHART_HEIGHT);
}

export function CalorieRangeChart({ daily, calorieMin, calorieMax }: Props) {
  const t = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    setSelectedDate(null);
  }, [daily]);

  const bandLow = calorieMin ?? calorieMax ?? null;
  const bandHigh = calorieMax ?? calorieMin ?? null;

  const scaleMax = useMemo(() => {
    const peak = Math.max(...daily.map((d) => d.summary.calories), bandHigh ?? 0, bandLow ?? 0, 1);
    return peak * 1.08;
  }, [daily, bandHigh, bandLow]);

  const contentMinWidth = Math.max(daily.length * COL_WIDTH, windowWidth - t.spacing.lg * 2 - LABEL_GUTTER - 32);

  const selected = daily.find((d) => d.date === selectedDate) ?? null;
  const selectedIndex = selected ? daily.findIndex((d) => d.date === selected.date) : -1;

  const bandTopY =
    bandHigh != null && bandHigh > 0 ? CHART_HEIGHT - valueToHeight(bandHigh, scaleMax) : null;
  const bandBottomY =
    bandLow != null && bandLow > 0 ? CHART_HEIGHT - valueToHeight(bandLow, scaleMax) : null;

  const onChartLayout = (e: LayoutChangeEvent) => {
    setChartWidth(e.nativeEvent.layout.width);
  };

  const plotWidth = chartWidth > 0 ? chartWidth : contentMinWidth;

  const tooltipLeft =
    selectedIndex >= 0
      ? Math.min(
          Math.max(selectedIndex * COL_WIDTH + COL_WIDTH / 2 - TOOLTIP_WIDTH / 2, 4),
          plotWidth - TOOLTIP_WIDTH - 4,
        )
      : 0;

  return (
    <View style={{ gap: t.spacing.sm }}>
      <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
        {STATS_COPY.calorieRangeChartTitle}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={{ minWidth: contentMinWidth }} onLayout={onChartLayout}>
            {selected ? (
              <View
                style={{
                  marginBottom: t.spacing.xs,
                  marginLeft: tooltipLeft,
                  width: TOOLTIP_WIDTH,
                  backgroundColor: t.colors.surface,
                  borderColor: t.colors.border,
                  borderWidth: 1,
                  borderRadius: t.radius.md,
                  padding: t.spacing.sm,
                  gap: 4,
                }}
              >
                <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                  {formatTooltipDate(selected.date)}
                </Text>
                <Text style={{ color: t.colors.primary, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>
                  {Math.round(selected.summary.calories)} kcal
                </Text>
                <Text style={{ color: t.colors.fg, fontSize: t.fontSize.caption }}>
                  {statusLabel(selected.calorieStatus, selected.hasRecords)}
                </Text>
                {selected.hasRecords ? (
                  <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                    {STATS_COPY.calorieTooltipMacros(
                      Math.round(selected.summary.protein),
                      Math.round(selected.summary.carbohydrate),
                      Math.round(selected.summary.fat),
                    )}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View style={{ height: CHART_HEIGHT, position: 'relative' }}>
              {bandLow != null && bandHigh != null && bandTopY != null && bandBottomY != null ? (
                <Svg
                  width={plotWidth}
                  height={CHART_HEIGHT}
                  style={{ position: 'absolute', left: 0, top: 0 }}
                  pointerEvents="none"
                >
                  <Rect
                    x={0}
                    y={bandTopY}
                    width={plotWidth}
                    height={Math.max(2, bandBottomY - bandTopY)}
                    fill={t.colors.primary}
                    opacity={0.12}
                  />
                  {bandHigh > 0 ? (
                    <Line
                      x1={0}
                      y1={bandTopY}
                      x2={plotWidth}
                      y2={bandTopY}
                      stroke={t.colors.info}
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                  ) : null}
                  {bandLow > 0 && bandLow !== bandHigh ? (
                    <Line
                      x1={0}
                      y1={bandBottomY}
                      x2={plotWidth}
                      y2={bandBottomY}
                      stroke={t.colors.info}
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                  ) : null}
                </Svg>
              ) : null}

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  height: CHART_HEIGHT,
                }}
              >
                {daily.map((p) => {
                  const barH = p.hasRecords
                    ? Math.max(6, valueToHeight(p.summary.calories, scaleMax))
                    : 6;
                  const isSelected = p.date === selectedDate;
                  const dom = dayOfMonth(p.date);
                  return (
                    <Pressable
                      key={p.date}
                      onPress={() => setSelectedDate((prev) => (prev === p.date ? null : p.date))}
                      style={{ width: COL_WIDTH, alignItems: 'center' }}
                      accessibilityRole="button"
                      accessibilityLabel={STATS_COPY.calorieBarA11y(dom, Math.round(p.summary.calories))}
                    >
                      <View
                        style={{
                          height: CHART_HEIGHT,
                          width: COL_WIDTH,
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                        }}
                      >
                        <View
                          style={{
                            width: BAR_WIDTH,
                            height: barH,
                            borderRadius: 4,
                            backgroundColor: statusColor(p.calorieStatus, p.hasRecords, t),
                            opacity: isSelected ? 1 : 0.92,
                          }}
                        />
                      </View>
                      <View
                        style={{
                          marginTop: 6,
                          minWidth: 26,
                          height: 26,
                          borderRadius: 13,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isSelected ? t.colors.primary : 'transparent',
                        }}
                      >
                        <Text
                          style={{
                            color: isSelected ? t.colors.primaryFg : t.colors.fgSubtle,
                            fontSize: 11,
                            fontWeight: isSelected ? '700' : '500',
                          }}
                        >
                          {dom || '·'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={{ width: LABEL_GUTTER, height: CHART_HEIGHT, position: 'relative' }}>
          {bandHigh != null && bandHigh > 0 && bandTopY != null ? (
            <Text
              style={{
                position: 'absolute',
                right: 0,
                top: bandTopY - 8,
                color: t.colors.fgMuted,
                fontSize: 10,
              }}
            >
              {Math.round(bandHigh)} kcal
            </Text>
          ) : null}
          {bandLow != null && bandLow > 0 && bandBottomY != null && bandLow !== bandHigh ? (
            <Text
              style={{
                position: 'absolute',
                right: 0,
                top: bandBottomY - 8,
                color: t.colors.fgMuted,
                fontSize: 10,
              }}
            >
              {Math.round(bandLow)} kcal
            </Text>
          ) : null}
        </View>
      </View>

      <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>
        {STATS_COPY.calorieRangeLegend}
      </Text>
    </View>
  );
}
