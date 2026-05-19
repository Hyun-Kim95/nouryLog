import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
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
  proteinGoalMaxG?: number | null;
};

const CHART_HEIGHT = 140;
const DAY_LABEL_HEIGHT = 32;
const COL_WIDTH = 52;
const BAR_WIDTH = 8;
const BAR_GAP = 4;
const LABEL_GUTTER = 56;
const TOOLTIP_SLOT_HEIGHT = 88;

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

function valueToHeight(value: number, scaleMax: number): number {
  if (!Number.isFinite(value) || scaleMax <= 0) return 0;
  return Math.max(0, (value / scaleMax) * CHART_HEIGHT);
}

function DashedGuideLine({ top, width, color }: { top: number; width: number; color: string }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        top,
        width,
        height: 0,
        borderTopWidth: 1,
        borderStyle: 'dashed',
        borderColor: color,
      }}
    />
  );
}

function TooltipSlot({
  selected,
  t,
}: {
  selected: CalorieDailyPoint | null;
  t: Theme;
}) {
  return (
    <View
      style={{
        height: TOOLTIP_SLOT_HEIGHT,
        justifyContent: 'center',
        marginBottom: t.spacing.xs,
        paddingHorizontal: t.spacing.xs,
      }}
    >
      {selected ? (
        <View
          style={{
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
          <Text style={{ color: t.colors.info, fontSize: t.fontSize.body, fontWeight: '600' }}>
            {STATS_COPY.calorieTooltipProtein(Math.round(Number(selected.summary?.protein ?? 0)))}
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
      ) : (
        <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption, textAlign: 'center' }}>
          {STATS_COPY.calorieChartTapHint}
        </Text>
      )}
    </View>
  );
}

export function CalorieRangeChart({ daily, calorieMin, calorieMax, proteinGoalMaxG }: Props) {
  const t = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [chartWidth, setChartWidth] = useState(0);

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

  const calorieScaleMax = useMemo(() => {
    if (!daily.length) return 1;
    const peaks = daily.map((d) => Number(d.summary?.calories ?? 0));
    const peak = Math.max(...peaks, goalHigh ?? 0, goalLow ?? 0, 1);
    return Number.isFinite(peak) && peak > 0 ? peak * 1.08 : 1;
  }, [daily, goalHigh, goalLow]);

  const proteinScaleMax = useMemo(() => {
    if (!daily.length) return 1;
    const peaks = daily.map((d) => Number(d.summary?.protein ?? 0));
    const peak = Math.max(...peaks, proteinGoalMaxG ?? 0, 1);
    return Number.isFinite(peak) && peak > 0 ? peak * 1.08 : 1;
  }, [daily, proteinGoalMaxG]);

  if (!daily.length) return null;

  const contentMinWidth = Math.max(
    daily.length * COL_WIDTH,
    Math.max(0, windowWidth - t.spacing.lg * 2 - LABEL_GUTTER - 32),
  );

  const selected = daily.find((d) => d.date === selectedDate) ?? null;

  const bandTopY =
    goalHigh != null && goalHigh > 0 ? CHART_HEIGHT - valueToHeight(goalHigh, calorieScaleMax) : null;
  const bandBottomY =
    goalLow != null && goalLow > 0 ? CHART_HEIGHT - valueToHeight(goalLow, calorieScaleMax) : null;

  const showBand =
    goalLow != null &&
    goalHigh != null &&
    goalLow > 0 &&
    goalHigh > 0 &&
    bandTopY != null &&
    bandBottomY != null;

  const onChartLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setChartWidth(w);
  };

  const plotWidth = chartWidth > 0 ? chartWidth : contentMinWidth;
  const plotBlockHeight = CHART_HEIGHT + DAY_LABEL_HEIGHT;

  return (
    <View style={{ gap: t.spacing.sm }}>
      <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
        {STATS_COPY.calorieRangeChartTitle}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <TooltipSlot selected={selected} t={t} />

          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
          >
            <View style={{ minWidth: contentMinWidth }} onLayout={onChartLayout}>
              <View style={{ height: plotBlockHeight, position: 'relative', width: plotWidth }}>
                {showBand ? (
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: 0,
                      width: plotWidth,
                      top: bandTopY,
                      height: Math.max(2, bandBottomY - bandTopY),
                      backgroundColor: t.colors.primary,
                      opacity: 0.12,
                      borderRadius: 2,
                    }}
                  />
                ) : null}
                {goalHigh != null && goalHigh > 0 && bandTopY != null ? (
                  <DashedGuideLine top={bandTopY} width={plotWidth} color={t.colors.info} />
                ) : null}
                {goalLow != null && goalLow > 0 && bandBottomY != null && goalLow !== goalHigh ? (
                  <DashedGuideLine top={bandBottomY} width={plotWidth} color={t.colors.info} />
                ) : null}

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    height: plotBlockHeight,
                  }}
                >
                  {daily.map((p) => {
                    const kcal = Number(p.summary?.calories ?? 0);
                    const proteinG = Number(p.summary?.protein ?? 0);
                    const status = normalizeStatus(p.calorieStatus, p.hasRecords);
                    const kcalBarH = p.hasRecords ? Math.max(6, valueToHeight(kcal, calorieScaleMax)) : 6;
                    const proteinBarH = p.hasRecords
                      ? Math.max(6, valueToHeight(proteinG, proteinScaleMax))
                      : 6;
                    const isSelected = p.date === selectedDate;
                    const dom = dayOfMonth(p.date);
                    return (
                      <Pressable
                        key={p.date}
                        onPress={() => setSelectedDate((prev) => (prev === p.date ? null : p.date))}
                        style={{ width: COL_WIDTH, alignItems: 'center' }}
                        accessibilityRole="button"
                        accessibilityLabel={STATS_COPY.calorieBarA11y(
                          dom,
                          Math.round(kcal),
                          Math.round(proteinG),
                        )}
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
                              flexDirection: 'row',
                              alignItems: 'flex-end',
                              gap: BAR_GAP,
                            }}
                          >
                            <View
                              style={{
                                width: BAR_WIDTH,
                                height: kcalBarH,
                                borderRadius: 4,
                                backgroundColor: statusColor(status, p.hasRecords, t),
                                opacity: isSelected ? 1 : 0.92,
                              }}
                            />
                            <View
                              style={{
                                width: BAR_WIDTH,
                                height: proteinBarH,
                                borderRadius: 4,
                                backgroundColor: p.hasRecords ? t.colors.info : t.colors.border,
                                opacity: isSelected ? 1 : 0.92,
                              }}
                            />
                          </View>
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
        </View>

        <View style={{ width: LABEL_GUTTER, height: plotBlockHeight, marginTop: TOOLTIP_SLOT_HEIGHT + t.spacing.xs }}>
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
