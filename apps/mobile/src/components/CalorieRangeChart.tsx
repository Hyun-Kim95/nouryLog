import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
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
};

const PANEL_HEIGHT = 108;
const DAY_LABEL_HEIGHT = 36;
const BAR_WIDTH_MAX = 14;
const LABEL_GUTTER = 64;
const TOOLTIP_SLOT_HEIGHT = 88;
const PROTEIN_TITLE_HEIGHT = 22;
const MIN_GUTTER_LABEL_GAP = 28;

type PanelGoals = {
  low: number | null;
  high: number | null;
  scaleMax: number;
};

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

function statusColor(status: FulfillmentStatus, hasRecords: boolean, t: Theme): string {
  if (!hasRecords) return t.colors.border;
  if (status === 'met') return t.colors.primary;
  if (status === 'under' || status === 'over') return t.colors.warn;
  return t.colors.fgMuted;
}

function valueToHeight(value: number, scaleMax: number): number {
  if (!Number.isFinite(value) || scaleMax <= 0) return 0;
  return Math.max(0, (value / scaleMax) * PANEL_HEIGHT);
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

function PanelBands({
  goals,
  plotWidth,
  bandColor,
  lineHighColor,
  lineLowColor,
}: {
  goals: PanelGoals;
  plotWidth: number;
  bandColor: string;
  lineHighColor: string;
  lineLowColor: string;
}) {
  const { low, high, scaleMax } = goals;
  const bandTopY =
    high != null && high > 0 ? PANEL_HEIGHT - valueToHeight(high, scaleMax) : null;
  const bandBottomY =
    low != null && low > 0 ? PANEL_HEIGHT - valueToHeight(low, scaleMax) : null;
  const showBand =
    low != null && high != null && low > 0 && high > 0 && bandTopY != null && bandBottomY != null;

  return (
    <>
      {showBand ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            width: plotWidth,
            top: bandTopY,
            height: Math.max(2, bandBottomY - bandTopY),
            backgroundColor: bandColor,
            opacity: 0.12,
            borderRadius: 2,
          }}
        />
      ) : null}
      {high != null && high > 0 && bandTopY != null ? (
        <DashedGuideLine top={bandTopY} width={plotWidth} color={lineHighColor} />
      ) : null}
      {low != null && low > 0 && bandBottomY != null && low !== high ? (
        <DashedGuideLine top={bandBottomY} width={plotWidth} color={lineLowColor} />
      ) : null}
    </>
  );
}

function PanelGutterLabels({
  goals,
  unit,
  color,
  panelTop,
}: {
  goals: PanelGoals;
  unit: string;
  color: string;
  panelTop: number;
}) {
  const { low, high, scaleMax } = goals;
  const bandTopY =
    high != null && high > 0 ? PANEL_HEIGHT - valueToHeight(high, scaleMax) : null;
  const bandBottomY =
    low != null && low > 0 ? PANEL_HEIGHT - valueToHeight(low, scaleMax) : null;

  if (high == null || high <= 0 || bandTopY == null) return null;

  if (low == null || low <= 0 || low === high || bandBottomY == null) {
    return (
      <Text
        style={{
          position: 'absolute',
          right: 0,
          top: panelTop + Math.max(0, bandTopY - 8),
          color,
          fontSize: 10,
        }}
      >
        {Math.round(high)}
        {unit}
      </Text>
    );
  }

  const bandHeight = bandBottomY - bandTopY;
  if (bandHeight < MIN_GUTTER_LABEL_GAP) {
    return (
      <Text
        style={{
          position: 'absolute',
          right: 0,
          top: panelTop + bandTopY + bandHeight / 2 - 8,
          color,
          fontSize: 10,
        }}
      >
        {STATS_COPY.goalRangeLabel(Math.round(low), Math.round(high), unit)}
      </Text>
    );
  }

  return (
    <>
      <Text
        style={{
          position: 'absolute',
          right: 0,
          top: panelTop + Math.max(0, bandTopY - 8),
          color,
          fontSize: 10,
        }}
      >
        {Math.round(high)}
        {unit}
      </Text>
      <Text
        style={{
          position: 'absolute',
          right: 0,
          top: panelTop + Math.min(PANEL_HEIGHT - 12, Math.max(0, bandBottomY - 8)),
          color,
          fontSize: 10,
        }}
      >
        {Math.round(low)}
        {unit}
      </Text>
    </>
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
            {formatTooltipTitle(selected)}
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

export function CalorieRangeChart({
  daily,
  calorieMin,
  calorieMax,
  proteinGoalMinG,
  proteinGoalMaxG,
}: Props) {
  const t = useTheme();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [plotInnerWidth, setPlotInnerWidth] = useState(0);

  useEffect(() => {
    setSelectedDate(null);
  }, [daily]);

  const calorieLow =
    calorieMin != null && calorieMax != null
      ? Math.min(calorieMin, calorieMax)
      : calorieMin ?? calorieMax ?? null;
  const calorieHigh =
    calorieMin != null && calorieMax != null
      ? Math.max(calorieMin, calorieMax)
      : calorieMax ?? calorieMin ?? null;

  const proteinLow =
    proteinGoalMinG != null && proteinGoalMaxG != null
      ? Math.min(proteinGoalMinG, proteinGoalMaxG)
      : null;
  const proteinHigh =
    proteinGoalMinG != null && proteinGoalMaxG != null
      ? Math.max(proteinGoalMinG, proteinGoalMaxG)
      : null;

  const calorieScaleMax = useMemo(() => {
    if (!daily.length) return 1;
    const peaks = daily.map((d) => Number(d.summary?.calories ?? 0));
    const peak = Math.max(...peaks, calorieHigh ?? 0, calorieLow ?? 0, 1);
    return Number.isFinite(peak) && peak > 0 ? peak * 1.08 : 1;
  }, [daily, calorieHigh, calorieLow]);

  const proteinScaleMax = useMemo(() => {
    if (!daily.length) return 1;
    const peaks = daily.map((d) => Number(d.summary?.protein ?? 0));
    const peak = Math.max(...peaks, proteinHigh ?? 0, proteinLow ?? 0, 1);
    return Number.isFinite(peak) && peak > 0 ? peak * 1.08 : 1;
  }, [daily, proteinHigh, proteinLow]);

  if (!daily.length) return null;

  const selected = daily.find((d) => d.date === selectedDate) ?? null;
  const calorieGoals: PanelGoals = { low: calorieLow, high: calorieHigh, scaleMax: calorieScaleMax };
  const proteinGoals: PanelGoals = { low: proteinLow, high: proteinHigh, scaleMax: proteinScaleMax };

  const onPlotLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setPlotInnerWidth(w);
  };

  const colWidth = plotInnerWidth > 0 ? Math.floor(plotInnerWidth / daily.length) : 0;
  const barWidth = colWidth > 0 ? Math.min(BAR_WIDTH_MAX, Math.max(8, Math.floor(colWidth * 0.45))) : BAR_WIDTH_MAX;
  const plotWidth = plotInnerWidth > 0 ? plotInnerWidth : colWidth * daily.length;
  const proteinPanelTop = PANEL_HEIGHT + PROTEIN_TITLE_HEIGHT;
  const columnBlockHeight = PANEL_HEIGHT + PROTEIN_TITLE_HEIGHT + PANEL_HEIGHT + DAY_LABEL_HEIGHT;
  const plotBlockHeight = columnBlockHeight;

  return (
    <View style={{ gap: t.spacing.sm }}>
      <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
        {STATS_COPY.calorieRangeChartTitle}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <TooltipSlot selected={selected} t={t} />

          <Text
            style={{
              color: t.colors.fgMuted,
              fontSize: t.fontSize.caption,
              fontWeight: '600',
              marginBottom: 4,
            }}
          >
            {STATS_COPY.caloriePanelTitle}
          </Text>

          <View style={{ width: '100%' }} onLayout={onPlotLayout}>
            <View style={{ height: plotBlockHeight, width: plotWidth || '100%', position: 'relative' }}>
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: plotWidth,
                  height: PANEL_HEIGHT,
                }}
              >
                <PanelBands
                  goals={calorieGoals}
                  plotWidth={plotWidth}
                  bandColor={t.colors.primary}
                  lineHighColor={t.colors.info}
                  lineLowColor={t.colors.info}
                />
              </View>

              <Text
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: PANEL_HEIGHT,
                  left: 0,
                  color: t.colors.fgMuted,
                  fontSize: t.fontSize.caption,
                  fontWeight: '600',
                  height: PROTEIN_TITLE_HEIGHT,
                  lineHeight: PROTEIN_TITLE_HEIGHT,
                }}
              >
                {STATS_COPY.proteinPanelTitle}
              </Text>

              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: proteinPanelTop,
                  left: 0,
                  width: plotWidth,
                  height: PANEL_HEIGHT,
                }}
              >
                <PanelBands
                  goals={proteinGoals}
                  plotWidth={plotWidth}
                  bandColor={t.colors.info}
                  lineHighColor={t.colors.info}
                  lineLowColor={t.colors.fgMuted}
                />
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  height: columnBlockHeight,
                  width: plotWidth || '100%',
                }}
              >
                {colWidth > 0
                  ? daily.map((p) => {
                      const kcal = Number(p.summary?.calories ?? 0);
                      const proteinG = Number(p.summary?.protein ?? 0);
                      const status = normalizeStatus(p.calorieStatus, p.hasRecords);
                      const kcalBarH = p.hasRecords
                        ? Math.max(6, valueToHeight(kcal, calorieScaleMax))
                        : 6;
                      const proteinBarH = p.hasRecords
                        ? Math.max(6, valueToHeight(proteinG, proteinScaleMax))
                        : 6;
                      const isSelected = p.date === selectedDate;

                      return (
                        <Pressable
                          key={p.date}
                          onPress={() => setSelectedDate((prev) => (prev === p.date ? null : p.date))}
                          style={{ width: colWidth, height: columnBlockHeight }}
                          accessibilityRole="button"
                          accessibilityLabel={STATS_COPY.calorieBarA11y(
                            dayOfMonth(p.date) || 0,
                            Math.round(kcal),
                            Math.round(proteinG),
                          )}
                        >
                          <View
                            style={{
                              height: PANEL_HEIGHT,
                              justifyContent: 'flex-end',
                              alignItems: 'center',
                            }}
                          >
                            <View
                              style={{
                                width: barWidth,
                                height: kcalBarH,
                                borderRadius: 4,
                                backgroundColor: statusColor(status, p.hasRecords, t),
                                opacity: isSelected ? 1 : 0.92,
                              }}
                            />
                          </View>
                          <View style={{ height: PROTEIN_TITLE_HEIGHT }} />
                          <View
                            style={{
                              height: PANEL_HEIGHT,
                              justifyContent: 'flex-end',
                              alignItems: 'center',
                            }}
                          >
                            <View
                              style={{
                                width: barWidth,
                                height: proteinBarH,
                                borderRadius: 4,
                                backgroundColor: p.hasRecords ? t.colors.info : t.colors.border,
                                opacity: isSelected ? 1 : 0.92,
                              }}
                            />
                          </View>
                          <View
                            style={{
                              height: DAY_LABEL_HEIGHT,
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
            width: LABEL_GUTTER,
            height: plotBlockHeight,
            marginTop: TOOLTIP_SLOT_HEIGHT + t.spacing.xs + 18,
            position: 'relative',
          }}
        >
          <PanelGutterLabels
            goals={calorieGoals}
            unit=" kcal"
            color={t.colors.fgMuted}
            panelTop={0}
          />
          <PanelGutterLabels
            goals={proteinGoals}
            unit="g"
            color={t.colors.info}
            panelTop={proteinPanelTop}
          />
        </View>
      </View>

      <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>
        {STATS_COPY.calorieRangeLegend}
      </Text>
    </View>
  );
}
