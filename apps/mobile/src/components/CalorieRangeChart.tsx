import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import type { FulfillmentStatus } from '../lib/goalFulfillment';
import type { Theme, ThemeColors } from '../theme';
import { STATS_COPY } from '../copy/stats';
import { useTheme } from '../theme';
import {
  PanelBands,
  PanelGutterLabels,
  RANGE_BAR_WIDTH_MAX,
  RANGE_DAY_LABEL_HEIGHT,
  RANGE_LABEL_GUTTER,
  RANGE_PANEL_HEIGHT,
  RANGE_TOOLTIP_SLOT_HEIGHT,
  valueToHeight,
  type PanelGoals,
} from './chart/rangePanel';

type NutritionSum = {
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
};

export type CalorieDailyPoint = {
  date: string;
  label?: string;
  summary: NutritionSum;
  calorieStatus?: FulfillmentStatus;
  hasRecords: boolean;
};

type Props = {
  daily: CalorieDailyPoint[];
  calorieMin: number | null;
  calorieMax: number | null;
  proteinGoalMinG?: number | null;
  proteinGoalMaxG?: number | null;
  carbohydrateGoalMinG?: number | null;
  carbohydrateGoalMaxG?: number | null;
  fatGoalMinG?: number | null;
  fatGoalMaxG?: number | null;
  chartTapHint?: string;
};

const PANEL_TITLE_HEIGHT = 22;
const PANEL_ROW_STRIDE = RANGE_PANEL_HEIGHT + PANEL_TITLE_HEIGHT;
const MACRO_PANEL_COUNT = 4;
const DIVIDER_TO_TITLE_GAP = 6;

type MacroPanelKey = 'calorie' | 'protein' | 'carb' | 'fat';

type MacroPanelDef = {
  key: MacroPanelKey;
  title: string;
  summaryKey: keyof NutritionSum;
  gutterUnit: string;
  gutterColor: (colors: ThemeColors) => string;
  bandColor: (colors: ThemeColors) => string;
  lineHighColor: (colors: ThemeColors) => string;
  lineLowColor: (colors: ThemeColors) => string;
  barColor: (point: CalorieDailyPoint, colors: ThemeColors) => string;
};

const MACRO_PANEL_DEFS: MacroPanelDef[] = [
  {
    key: 'calorie',
    title: STATS_COPY.caloriePanelTitle,
    summaryKey: 'calories',
    gutterUnit: ' kcal',
    gutterColor: (c) => c.fgMuted,
    bandColor: (c) => c.primary,
    lineHighColor: (c) => c.info,
    lineLowColor: (c) => c.info,
    barColor: (p, c) => statusColor(normalizeStatus(p.calorieStatus, p.hasRecords), p.hasRecords, c),
  },
  {
    key: 'protein',
    title: STATS_COPY.proteinPanelTitle,
    summaryKey: 'protein',
    gutterUnit: 'g',
    gutterColor: (c) => c.info,
    bandColor: (c) => c.info,
    lineHighColor: (c) => c.info,
    lineLowColor: (c) => c.fgMuted,
    barColor: (p, c) => (p.hasRecords ? c.info : c.border),
  },
  {
    key: 'carb',
    title: STATS_COPY.carbPanelTitle,
    summaryKey: 'carbohydrate',
    gutterUnit: 'g',
    gutterColor: (c) => c.warn,
    bandColor: (c) => c.warn,
    lineHighColor: (c) => c.warn,
    lineLowColor: (c) => c.fgMuted,
    barColor: (p, c) => (p.hasRecords ? c.warn : c.border),
  },
  {
    key: 'fat',
    title: STATS_COPY.fatPanelTitle,
    summaryKey: 'fat',
    gutterUnit: 'g',
    gutterColor: (c) => c.success,
    bandColor: (c) => c.success,
    lineHighColor: (c) => c.success,
    lineLowColor: (c) => c.fgMuted,
    barColor: (p, c) => (p.hasRecords ? c.success : c.border),
  },
];

function dayOfMonth(ymd: string): number {
  const parts = ymd.split('-');
  if (parts.length !== 3) return 0;
  return Number(parts[2]) || 0;
}

function axisLabel(p: CalorieDailyPoint): string {
  if (p.label) return p.label;
  const dom = dayOfMonth(p.date);
  return dom ? String(dom) : '·';
}

function formatTooltipTitle(p: CalorieDailyPoint): string {
  if (p.label) return p.label;
  const parts = p.date.split('-');
  if (parts.length !== 3) return p.date;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'] as const;
  const w = weekdays[d.getDay()];
  return w
    ? `${Number(parts[1])}월 ${Number(parts[2])}일 (${w})`
    : `${Number(parts[1])}월 ${Number(parts[2])}일`;
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

function statusColor(status: FulfillmentStatus, hasRecords: boolean, colors: ThemeColors): string {
  if (!hasRecords) return colors.border;
  if (status === 'met') return colors.primary;
  if (status === 'under' || status === 'over') return colors.warn;
  return colors.fgMuted;
}

function goalRange(
  min: number | null | undefined,
  max: number | null | undefined,
): { low: number | null; high: number | null } {
  if (min != null && max != null) {
    return { low: Math.min(min, max), high: Math.max(min, max) };
  }
  const single = min ?? max;
  if (single != null) {
    return { low: single, high: single };
  }
  return { low: null, high: null };
}

function scaleMaxForField(
  daily: CalorieDailyPoint[],
  field: keyof NutritionSum,
  goalLow: number | null,
  goalHigh: number | null,
): number {
  if (!daily.length) return 1;
  const peaks = daily.map((d) => Number(d.summary?.[field] ?? 0));
  const peak = Math.max(...peaks, goalHigh ?? 0, goalLow ?? 0, 1);
  return Number.isFinite(peak) && peak > 0 ? peak * 1.08 : 1;
}

function panelContentTop(panelIndex: number): number {
  if (panelIndex === 0) return 0;
  return panelIndex * PANEL_ROW_STRIDE;
}

function panelTitleTop(panelIndex: number): number {
  return RANGE_PANEL_HEIGHT + (panelIndex - 1) * PANEL_ROW_STRIDE;
}

/** 패널 제목 행 바로 위 — 매크로 구간 구분선 */
function panelSectionDividerTop(sectionIndex: number): number {
  if (sectionIndex <= 0) return 0;
  return panelContentTop(sectionIndex - 1) + RANGE_PANEL_HEIGHT;
}

const COLUMN_BLOCK_HEIGHT =
  MACRO_PANEL_COUNT * RANGE_PANEL_HEIGHT + (MACRO_PANEL_COUNT - 1) * PANEL_TITLE_HEIGHT + RANGE_DAY_LABEL_HEIGHT;

function TooltipSlot({
  selected,
  t,
  chartTapHint,
}: {
  selected: CalorieDailyPoint | null;
  t: Theme;
  chartTapHint: string;
}) {
  return (
    <View
      style={{
        height: RANGE_TOOLTIP_SLOT_HEIGHT,
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
            {formatTooltipTitle(selected)}
          </Text>
          <Text style={{ color: t.colors.primary, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>
            {Math.round(Number(selected.summary?.calories ?? 0))} kcal
          </Text>
          {selected.hasRecords ? (
            <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
              {STATS_COPY.calorieTooltipMacros(
                Math.round(Number(selected.summary?.protein ?? 0)),
                Math.round(Number(selected.summary?.carbohydrate ?? 0)),
                Math.round(Number(selected.summary?.fat ?? 0)),
              )}
            </Text>
          ) : null}
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
            {statusLabel(
              normalizeStatus(selected.calorieStatus, selected.hasRecords),
              selected.hasRecords,
            )}
          </Text>
        </View>
      ) : (
        <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption, textAlign: 'center' }}>
          {chartTapHint}
        </Text>
      )}
    </View>
  );
}

export function CalorieRangeChart({
  daily,
  calorieMin,
  calorieMax,
  proteinGoalMinG,
  proteinGoalMaxG,
  carbohydrateGoalMinG,
  carbohydrateGoalMaxG,
  fatGoalMinG,
  fatGoalMaxG,
  chartTapHint = STATS_COPY.calorieChartTapHint,
}: Props) {
  const t = useTheme();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [plotInnerWidth, setPlotInnerWidth] = useState(0);

  useEffect(() => {
    setSelectedDate(null);
  }, [daily]);

  const calorieGoalRange = useMemo(() => goalRange(calorieMin, calorieMax), [calorieMin, calorieMax]);
  const proteinGoalRange = useMemo(
    () => goalRange(proteinGoalMinG, proteinGoalMaxG),
    [proteinGoalMinG, proteinGoalMaxG],
  );
  const carbGoalRange = useMemo(
    () => goalRange(carbohydrateGoalMinG, carbohydrateGoalMaxG),
    [carbohydrateGoalMinG, carbohydrateGoalMaxG],
  );
  const fatGoalRange = useMemo(() => goalRange(fatGoalMinG, fatGoalMaxG), [fatGoalMinG, fatGoalMaxG]);

  const scaleMaxByKey = useMemo(() => {
    const ranges = [calorieGoalRange, proteinGoalRange, carbGoalRange, fatGoalRange];
    const out = {} as Record<MacroPanelKey, number>;
    MACRO_PANEL_DEFS.forEach((def, i) => {
      const { low, high } = ranges[i];
      out[def.key] = scaleMaxForField(daily, def.summaryKey, low, high);
    });
    return out;
  }, [daily, calorieGoalRange, proteinGoalRange, carbGoalRange, fatGoalRange]);

  if (!daily.length) return null;

  const selected = daily.find((d) => d.date === selectedDate) ?? null;
  const goalRanges = [calorieGoalRange, proteinGoalRange, carbGoalRange, fatGoalRange];

  const panelGoals: PanelGoals[] = MACRO_PANEL_DEFS.map((def, i) => {
    const { low, high } = goalRanges[i];
    return { low, high, scaleMax: scaleMaxByKey[def.key] };
  });

  const onPlotLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setPlotInnerWidth(w);
  };

  const colWidth = plotInnerWidth > 0 ? Math.floor(plotInnerWidth / daily.length) : 0;
  const plotRemainder = plotInnerWidth > 0 && colWidth > 0 ? plotInnerWidth - colWidth * daily.length : 0;
  const plotContentWidth =
    colWidth > 0 ? colWidth * daily.length + plotRemainder : plotInnerWidth > 0 ? plotInnerWidth : 0;
  const barWidth =
    colWidth > 0 ? Math.min(RANGE_BAR_WIDTH_MAX, Math.max(8, Math.floor(colWidth * 0.45))) : RANGE_BAR_WIDTH_MAX;
  const plotWidth = plotContentWidth > 0 ? plotContentWidth : colWidth * daily.length;
  const plotBlockHeight = COLUMN_BLOCK_HEIGHT;
  const gutterMarginTop = RANGE_TOOLTIP_SLOT_HEIGHT + t.spacing.xs + PANEL_TITLE_HEIGHT;

  return (
    <View style={{ gap: t.spacing.sm }}>
      <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
        {STATS_COPY.calorieRangeChartTitle}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <TooltipSlot selected={selected} t={t} chartTapHint={chartTapHint} />

          <Text
            style={{
              color: t.colors.fgMuted,
              fontSize: t.fontSize.caption,
              fontWeight: '600',
              height: PANEL_TITLE_HEIGHT,
              lineHeight: PANEL_TITLE_HEIGHT,
            }}
          >
            {MACRO_PANEL_DEFS[0].title}
          </Text>

          <View style={{ width: '100%' }} onLayout={onPlotLayout}>
            <View style={{ height: plotBlockHeight, width: plotWidth || '100%', position: 'relative' }}>
              {MACRO_PANEL_DEFS.map((def, panelIndex) => {
                const contentTop = panelContentTop(panelIndex);
                const goals = panelGoals[panelIndex];
                return (
                  <View key={def.key}>
                    {panelIndex > 0 ? (
                      <View
                        pointerEvents="none"
                        style={{
                          position: 'absolute',
                          top: panelSectionDividerTop(panelIndex),
                          left: 0,
                          width: plotWidth || '100%',
                          height: 1,
                          backgroundColor: t.colors.border,
                        }}
                      />
                    ) : null}
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: contentTop,
                        left: 0,
                        width: plotWidth,
                        height: RANGE_PANEL_HEIGHT,
                      }}
                    >
                      <PanelBands
                        goals={goals}
                        plotWidth={plotWidth}
                        bandColor={def.bandColor(t.colors)}
                        lineHighColor={def.lineHighColor(t.colors)}
                        lineLowColor={def.lineLowColor(t.colors)}
                      />
                    </View>
                    {panelIndex < MACRO_PANEL_COUNT - 1 ? (
                      <Text
                        pointerEvents="none"
                        style={{
                          position: 'absolute',
                          top: panelTitleTop(panelIndex + 1) + DIVIDER_TO_TITLE_GAP,
                          left: 0,
                          color: t.colors.fgMuted,
                          fontSize: t.fontSize.caption,
                          fontWeight: '600',
                          height: PANEL_TITLE_HEIGHT - DIVIDER_TO_TITLE_GAP,
                          lineHeight: PANEL_TITLE_HEIGHT - DIVIDER_TO_TITLE_GAP,
                        }}
                      >
                        {MACRO_PANEL_DEFS[panelIndex + 1].title}
                      </Text>
                    ) : null}
                  </View>
                );
              })}

              <View
                style={{
                  flexDirection: 'row',
                  height: COLUMN_BLOCK_HEIGHT,
                  width: plotWidth || '100%',
                }}
              >
                {colWidth > 0
                  ? daily.map((p, dayIndex) => {
                      const isSelected = p.date === selectedDate;
                      const isLast = dayIndex === daily.length - 1;
                      const columnWidth = isLast ? colWidth + plotRemainder : colWidth;
                      const values = MACRO_PANEL_DEFS.map((def) =>
                        Number(p.summary?.[def.summaryKey] ?? 0),
                      );

                      return (
                        <Pressable
                          key={p.date}
                          onPress={() => setSelectedDate((prev) => (prev === p.date ? null : p.date))}
                          style={{ width: columnWidth, height: COLUMN_BLOCK_HEIGHT }}
                          accessibilityRole="button"
                          accessibilityLabel={STATS_COPY.macroBarA11y(
                            dayOfMonth(p.date) || 0,
                            Math.round(values[0]),
                            Math.round(values[1]),
                            Math.round(values[2]),
                            Math.round(values[3]),
                          )}
                        >
                          {MACRO_PANEL_DEFS.map((def, panelIndex) => {
                            const value = values[panelIndex];
                            const scaleMax = scaleMaxByKey[def.key];
                            const barH = p.hasRecords
                              ? Math.max(6, valueToHeight(value, scaleMax, RANGE_PANEL_HEIGHT))
                              : 6;
                            return (
                              <View key={def.key}>
                                <View
                                  style={{
                                    height: RANGE_PANEL_HEIGHT,
                                    justifyContent: 'flex-end',
                                    alignItems: 'center',
                                  }}
                                >
                                  <View
                                    style={{
                                      width: barWidth,
                                      height: barH,
                                      borderRadius: 4,
                                      backgroundColor: def.barColor(p, t.colors),
                                      opacity: isSelected ? 1 : 0.92,
                                    }}
                                  />
                                </View>
                                {panelIndex < MACRO_PANEL_COUNT - 1 ? (
                                  <View style={{ height: PANEL_TITLE_HEIGHT }} />
                                ) : null}
                              </View>
                            );
                          })}
                          <View
                            style={{
                              height: RANGE_DAY_LABEL_HEIGHT,
                              alignItems: 'center',
                              justifyContent: 'center',
                              paddingHorizontal: 2,
                            }}
                          >
                            <View
                              style={{
                                minWidth: 22,
                                minHeight: 24,
                                paddingHorizontal: 3,
                                paddingVertical: 2,
                                borderRadius: 12,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: isSelected ? t.colors.primary : 'transparent',
                              }}
                            >
                              <Text
                                style={{
                                  color: isSelected ? t.colors.primaryFg : t.colors.fgSubtle,
                                  fontSize: 9,
                                  fontWeight: isSelected ? '700' : '500',
                                  textAlign: 'center',
                                }}
                                numberOfLines={2}
                                adjustsFontSizeToFit
                                minimumFontScale={0.75}
                              >
                                {axisLabel(p)}
                              </Text>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })
                  : null}
              </View>
            </View>
          </View>
        </View>

        <View
          style={{
            width: RANGE_LABEL_GUTTER,
            height: plotBlockHeight,
            marginTop: gutterMarginTop,
            position: 'relative',
          }}
        >
          {[1, 2, 3].map((panelIndex) => (
            <View
              key={`gutter-divider-${panelIndex}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: panelSectionDividerTop(panelIndex),
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: t.colors.border,
              }}
            />
          ))}
          {MACRO_PANEL_DEFS.map((def, panelIndex) => (
            <PanelGutterLabels
              key={`gutter-label-${def.key}`}
              goals={panelGoals[panelIndex]}
              unit={def.gutterUnit}
              color={def.gutterColor(t.colors)}
              panelTop={panelContentTop(panelIndex)}
              formatGoalRangeLabel={STATS_COPY.goalRangeLabel}
            />
          ))}
        </View>
      </View>

      <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>
        {STATS_COPY.calorieRangeLegend}
      </Text>
    </View>
  );
}
