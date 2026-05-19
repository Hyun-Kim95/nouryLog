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
const COL_WIDTH = 52;
const BAR_WIDTH = 14;
const LABEL_GUTTER = 56;
const TOOLTIP_SLOT_HEIGHT = 88;
const PROTEIN_TITLE_HEIGHT = 22;

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

  return (
    <>
      {high != null && high > 0 && bandTopY != null ? (
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
      ) : null}
      {low != null && low > 0 && bandBottomY != null && low !== high ? (
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
      ) : null}
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
  const { width: windowWidth } = useWindowDimensions();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [chartWidth, setChartWidth] = useState(0);

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

  const contentMinWidth = Math.max(
    daily.length * COL_WIDTH,
    Math.max(0, windowWidth - t.spacing.lg * 2 - LABEL_GUTTER - 32),
  );

  const selected = daily.find((d) => d.date === selectedDate) ?? null;

  const calorieGoals: PanelGoals = { low: calorieLow, high: calorieHigh, scaleMax: calorieScaleMax };
  const proteinGoals: PanelGoals = { low: proteinLow, high: proteinHigh, scaleMax: proteinScaleMax };

  const onChartLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setChartWidth(w);
  };

  const plotWidth = chartWidth > 0 ? chartWidth : contentMinWidth;
  const proteinPanelTop = PANEL_HEIGHT + PROTEIN_TITLE_HEIGHT;
  const labelsTop = proteinPanelTop + PANEL_HEIGHT;
  const plotBlockHeight = labelsTop + DAY_LABEL_HEIGHT;

  const renderBars = (
    metric: 'calorie' | 'protein',
    scaleMax: number,
  ) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: PANEL_HEIGHT,
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: plotWidth,
      }}
      pointerEvents="box-none"
    >
      {daily.map((p) => {
        const kcal = Number(p.summary?.calories ?? 0);
        const proteinG = Number(p.summary?.protein ?? 0);
        const value = metric === 'calorie' ? kcal : proteinG;
        const barH = p.hasRecords ? Math.max(6, valueToHeight(value, scaleMax)) : 6;
        const status = normalizeStatus(p.calorieStatus, p.hasRecords);
        const barColor =
          metric === 'calorie'
            ? statusColor(status, p.hasRecords, t)
            : p.hasRecords
              ? t.colors.info
              : t.colors.border;
        const isSelected = p.date === selectedDate;

        return (
          <View
            key={`${p.date}-${metric}`}
            style={{ width: COL_WIDTH, alignItems: 'center', justifyContent: 'flex-end', height: PANEL_HEIGHT }}
            pointerEvents="none"
          >
            <View
              style={{
                width: BAR_WIDTH,
                height: barH,
                borderRadius: 4,
                backgroundColor: barColor,
                opacity: isSelected ? 1 : 0.92,
              }}
            />
          </View>
        );
      })}
    </View>
  );

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

          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
          >
            <View style={{ minWidth: contentMinWidth }} onLayout={onChartLayout}>
              <View style={{ height: plotBlockHeight, width: plotWidth, position: 'relative' }}>
                <View style={{ height: PANEL_HEIGHT, position: 'relative' }}>
                  <PanelBands
                    goals={calorieGoals}
                    plotWidth={plotWidth}
                    bandColor={t.colors.primary}
                    lineHighColor={t.colors.info}
                    lineLowColor={t.colors.info}
                  />
                  {renderBars('calorie', calorieScaleMax)}
                </View>

                <Text
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
                  style={{
                    position: 'absolute',
                    top: proteinPanelTop,
                    left: 0,
                    height: PANEL_HEIGHT,
                    width: plotWidth,
                  }}
                >
                  <PanelBands
                    goals={proteinGoals}
                    plotWidth={plotWidth}
                    bandColor={t.colors.info}
                    lineHighColor={t.colors.info}
                    lineLowColor={t.colors.fgMuted}
                  />
                  {renderBars('protein', proteinScaleMax)}
                </View>

                <View
                  style={{
                    position: 'absolute',
                    top: labelsTop,
                    left: 0,
                    flexDirection: 'row',
                    height: DAY_LABEL_HEIGHT,
                    alignItems: 'center',
                  }}
                >
                  {daily.map((p) => {
                    const isSelected = p.date === selectedDate;
                    const kcal = Math.round(Number(p.summary?.calories ?? 0));
                    const proteinG = Math.round(Number(p.summary?.protein ?? 0));
                    return (
                      <Pressable
                        key={p.date}
                        onPress={() => setSelectedDate((prev) => (prev === p.date ? null : p.date))}
                        style={{ width: COL_WIDTH, alignItems: 'center', paddingHorizontal: 2 }}
                        accessibilityRole="button"
                        accessibilityLabel={STATS_COPY.calorieBarA11y(
                          dayOfMonth(p.date) || 0,
                          kcal,
                          proteinG,
                        )}
                      >
                        <View
                          style={{
                            minWidth: 26,
                            minHeight: 26,
                            paddingHorizontal: 4,
                            paddingVertical: 2,
                            borderRadius: 13,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isSelected ? t.colors.primary : 'transparent',
                          }}
                        >
                          <Text
                            style={{
                              color: isSelected ? t.colors.primaryFg : t.colors.fgSubtle,
                              fontSize: 10,
                              fontWeight: isSelected ? '700' : '500',
                              textAlign: 'center',
                            }}
                            numberOfLines={2}
                          >
                            {axisLabel(p)}
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
