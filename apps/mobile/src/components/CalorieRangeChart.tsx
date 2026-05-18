import { useEffect, useMemo, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
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

export type CalorieDailyPoint = {
  date: string;
  summary: NutritionSum;
  calorieStatus?: FulfillmentStatus;
  hasRecords: boolean;
};

type Props = {
  daily: CalorieDailyPoint[];
  calorieMin: number | null;
  calorieMax: number | null;
};

const CHART_HEIGHT = 160;
const BAR_WIDTH = 20;
const SPACING = 16;
const INITIAL_SPACING = 8;
const LABEL_GUTTER = 56;
const TOOLTIP_WIDTH = 200;
const MIN_BAR_VALUE = 4;

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
  const w = weekdays[d.getDay()];
  return w ? `${Number(parts[1])}월 ${Number(parts[2])}일 (${w})` : `${Number(parts[1])}월 ${Number(parts[2])}일`;
}

function normalizeStatus(status: FulfillmentStatus | undefined, hasRecords: boolean): FulfillmentStatus {
  if (!hasRecords) return 'none';
  if (status === 'under' || status === 'over' || status === 'met') return status;
  return 'none';
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

function valueToOffset(value: number, scaleMax: number): number {
  if (!Number.isFinite(value) || scaleMax <= 0) return 0;
  return Math.max(0, (value / scaleMax) * CHART_HEIGHT);
}

export function CalorieRangeChart({ daily, calorieMin, calorieMax }: Props) {
  const t = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    setSelectedDate(null);
  }, [daily]);

  const goalLow =
    calorieMin != null && calorieMax != null
      ? Math.min(calorieMin, calorieMax)
      : calorieMin ?? calorieMax ?? null;
  const goalHigh =
    calorieMin != null && calorieMax != null
      ? Math.max(calorieMin, calorieMax)
      : calorieMax ?? calorieMin ?? null;

  const scaleMax = useMemo(() => {
    if (!daily.length) return 1;
    const peaks = daily.map((d) => Number(d.summary?.calories ?? 0));
    const peak = Math.max(...peaks, goalHigh ?? 0, goalLow ?? 0, 1);
    return Number.isFinite(peak) && peak > 0 ? peak * 1.08 : 1;
  }, [daily, goalHigh, goalLow]);

  const barData = useMemo(() => {
    return daily.map((p) => {
      const kcal = Number(p.summary?.calories ?? 0);
      const status = normalizeStatus(p.calorieStatus, p.hasRecords);
      const dom = dayOfMonth(p.date);
      const isSelected = p.date === selectedDate;
      const barValue = p.hasRecords ? Math.max(MIN_BAR_VALUE, kcal) : MIN_BAR_VALUE;
      return {
        value: barValue,
        label: dom ? String(dom) : '·',
        frontColor: statusColor(status, p.hasRecords, t),
        onPress: () => setSelectedDate((prev) => (prev === p.date ? null : p.date)),
        labelComponent: () => (
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
        ),
      };
    });
  }, [daily, selectedDate, t]);

  if (!daily.length) return null;

  const plotMinWidth = Math.max(
    daily.length * (BAR_WIDTH + SPACING) + INITIAL_SPACING * 2,
    Math.max(0, windowWidth - t.spacing.lg * 2 - LABEL_GUTTER - 32),
  );

  const selected = daily.find((d) => d.date === selectedDate) ?? null;
  const selectedIndex = selected ? daily.findIndex((d) => d.date === selected.date) : -1;

  const bandTopY =
    goalHigh != null && goalHigh > 0 ? CHART_HEIGHT - valueToOffset(goalHigh, scaleMax) : null;
  const bandBottomY =
    goalLow != null && goalLow > 0 ? CHART_HEIGHT - valueToOffset(goalLow, scaleMax) : null;

  const showBand =
    goalLow != null &&
    goalHigh != null &&
    goalLow > 0 &&
    goalHigh > 0 &&
    bandTopY != null &&
    bandBottomY != null;

  const tooltipLeft =
    selectedIndex >= 0
      ? Math.min(
          Math.max(
            INITIAL_SPACING + selectedIndex * (BAR_WIDTH + SPACING) + BAR_WIDTH / 2 - TOOLTIP_WIDTH / 2,
            4,
          ),
          Math.max(4, plotMinWidth - TOOLTIP_WIDTH - 4),
        )
      : 0;

  const refLineConfig = {
    color: t.colors.info,
    thickness: 1,
    type: 'dashed' as const,
    dashWidth: 4,
    dashGap: 4,
  };

  return (
    <View style={{ gap: t.spacing.sm }}>
      <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
        {STATS_COPY.calorieRangeChartTitle}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
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
                {Math.round(Number(selected.summary?.calories ?? 0))} kcal
              </Text>
              <Text style={{ color: t.colors.fg, fontSize: t.fontSize.caption }}>
                {statusLabel(
                  normalizeStatus(selected.calorieStatus, selected.hasRecords),
                  selected.hasRecords,
                )}
              </Text>
              {selected.hasRecords ? (
                <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                  {STATS_COPY.calorieTooltipMacros(
                    Math.round(Number(selected.summary?.protein ?? 0)),
                    Math.round(Number(selected.summary?.carbohydrate ?? 0)),
                    Math.round(Number(selected.summary?.fat ?? 0)),
                  )}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={{ height: CHART_HEIGHT, position: 'relative' }}>
            {showBand ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: INITIAL_SPACING,
                  right: 0,
                  top: bandTopY,
                  height: Math.max(2, bandBottomY - bandTopY),
                  backgroundColor: t.colors.primary,
                  opacity: 0.12,
                  borderRadius: 2,
                  zIndex: 0,
                }}
              />
            ) : null}
            <BarChart
              data={barData}
              maxValue={scaleMax}
              height={CHART_HEIGHT}
              barWidth={BAR_WIDTH}
              spacing={SPACING}
              initialSpacing={INITIAL_SPACING}
              endSpacing={INITIAL_SPACING}
              width={plotMinWidth}
              parentWidth={Math.max(0, windowWidth - t.spacing.lg * 2 - LABEL_GUTTER - 16)}
              disableScroll={false}
              showScrollIndicator={false}
              hideRules
              hideYAxisText
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisLabelWidth={0}
              labelsExtraHeight={36}
              xAxisLabelsHeight={0}
              noOfSections={4}
              barBorderRadius={4}
              isAnimated
              animationDuration={400}
              showReferenceLine1={goalHigh != null && goalHigh > 0}
              referenceLine1Position={goalHigh ?? 0}
              referenceLine1Config={refLineConfig}
              showReferenceLine2={
                goalLow != null && goalLow > 0 && goalLow !== goalHigh
              }
              referenceLine2Position={goalLow ?? 0}
              referenceLine2Config={refLineConfig}
              referenceLinesOverChartContent
            />
          </View>
        </View>

        <View style={{ width: LABEL_GUTTER, height: CHART_HEIGHT, position: 'relative' }}>
          {goalHigh != null && goalHigh > 0 && bandTopY != null ? (
            <Text
              style={{
                position: 'absolute',
                right: 0,
                top: Math.max(0, bandTopY - 8),
                color: t.colors.fgMuted,
                fontSize: 10,
              }}
            >
              {Math.round(goalHigh)} kcal
            </Text>
          ) : null}
          {goalLow != null && goalLow > 0 && bandBottomY != null && goalLow !== goalHigh ? (
            <Text
              style={{
                position: 'absolute',
                right: 0,
                top: Math.min(CHART_HEIGHT - 12, Math.max(0, bandBottomY - 8)),
                color: t.colors.fgMuted,
                fontSize: 10,
              }}
            >
              {Math.round(goalLow)} kcal
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
