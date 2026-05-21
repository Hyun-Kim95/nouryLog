import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import type { WeightEntryItem } from '../api/weightEntries';
import { WEIGHT_COPY } from '../copy/weight';
import { useTheme } from '../theme';
import type { Theme } from '../theme';
import {
  PanelBands,
  PanelGutterLabels,
  RANGE_DAY_LABEL_HEIGHT,
  RANGE_LABEL_GUTTER,
  RANGE_PANEL_HEIGHT,
  RANGE_TOOLTIP_SLOT_HEIGHT,
  valueToHeight,
  type PanelGoals,
} from './chart/rangePanel';

type Point = {
  id: string;
  date: string;
  weightKg: number;
};

type Props = {
  entries: WeightEntryItem[];
  weightKgMin?: number | null;
  weightKgMax?: number | null;
};

const COL_WIDTH = 48;
const POINT_RADIUS = 5;
const POINT_RADIUS_SELECTED = 7;

function dayOfMonth(ymd: string): number {
  const parts = ymd.split('-');
  if (parts.length !== 3) return 0;
  return Number(parts[2]) || 0;
}

function formatTooltipTitle(ymd: string): string {
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'] as const;
  const w = weekdays[d.getDay()];
  return w
    ? `${Number(parts[1])}월 ${Number(parts[2])}일 (${w})`
    : `${Number(parts[1])}월 ${Number(parts[2])}일`;
}

function WeightTooltipSlot({
  selected,
  t,
}: {
  selected: Point | null;
  t: Theme;
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
            {formatTooltipTitle(selected.date)}
          </Text>
          <Text style={{ color: t.colors.primary, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>
            {selected.weightKg} kg
          </Text>
        </View>
      ) : (
        <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption, textAlign: 'center' }}>
          {WEIGHT_COPY.chartTapHint}
        </Text>
      )}
    </View>
  );
}

function plotY(weightKg: number, scaleMax: number): number {
  return RANGE_PANEL_HEIGHT - valueToHeight(weightKg, scaleMax, RANGE_PANEL_HEIGHT);
}

export function WeightTrendChart({ entries, weightKgMin = null, weightKgMax = null }: Props) {
  const t = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plotInnerWidth, setPlotInnerWidth] = useState(0);

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

  const bandLow =
    weightKgMin != null && weightKgMax != null
      ? Math.min(weightKgMin, weightKgMax)
      : weightKgMin ?? weightKgMax ?? null;
  const bandHigh =
    weightKgMin != null && weightKgMax != null
      ? Math.max(weightKgMin, weightKgMax)
      : weightKgMax ?? weightKgMin ?? null;

  const scaleMax = useMemo(() => {
    if (!points.length) return 1;
    const peak = Math.max(...points.map((p) => p.weightKg), bandHigh ?? 0, bandLow ?? 0, 1);
    return Number.isFinite(peak) && peak > 0 ? peak * 1.08 : 1;
  }, [points, bandHigh, bandLow]);

  if (!points.length) return null;

  const selected = points.find((p) => p.id === selectedId) ?? null;
  const goals: PanelGoals = { low: bandLow, high: bandHigh, scaleMax };
  const columnBlockHeight = RANGE_PANEL_HEIGHT + RANGE_DAY_LABEL_HEIGHT;

  const contentMinWidth = Math.max(
    points.length * COL_WIDTH,
    Math.max(0, windowWidth - t.spacing.lg * 2 - RANGE_LABEL_GUTTER - 32),
  );

  const onPlotLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setPlotInnerWidth(w);
  };

  const colWidth = plotInnerWidth > 0 ? Math.floor(plotInnerWidth / points.length) : COL_WIDTH;
  const plotWidth = plotInnerWidth > 0 ? plotInnerWidth : points.length * COL_WIDTH;

  const coords = points.map((p, i) => ({
    ...p,
    x: (i + 0.5) * (colWidth || COL_WIDTH),
    y: plotY(p.weightKg, scaleMax),
  }));

  const polylinePoints =
    coords.length >= 2
      ? coords.map((c) => `${c.x},${c.y}`).join(' ')
      : coords.length === 1
        ? `${coords[0].x},${coords[0].y} ${coords[0].x},${coords[0].y}`
        : '';

  return (
    <View style={{ gap: t.spacing.sm }}>
      <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
        {WEIGHT_COPY.chartTitle}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <WeightTooltipSlot selected={selected} t={t} />

          <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
            <View style={{ minWidth: contentMinWidth, width: plotWidth }} onLayout={onPlotLayout}>
              <View style={{ height: columnBlockHeight, width: plotWidth, position: 'relative' }}>
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: plotWidth,
                    height: RANGE_PANEL_HEIGHT,
                  }}
                >
                  <PanelBands
                    goals={goals}
                    plotWidth={plotWidth}
                    bandColor={t.colors.primary}
                    lineHighColor={t.colors.info}
                    lineLowColor={t.colors.info}
                  />
                </View>

                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: plotWidth,
                    height: RANGE_PANEL_HEIGHT,
                  }}
                >
                  <Svg width={plotWidth} height={RANGE_PANEL_HEIGHT}>
                    {coords.length >= 2 ? (
                      <Polyline
                        points={polylinePoints}
                        fill="none"
                        stroke={t.colors.primary}
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        opacity={0.85}
                      />
                    ) : null}
                    {coords.map((c) => {
                      const isSelected = c.id === selectedId;
                      const r = isSelected ? POINT_RADIUS_SELECTED : POINT_RADIUS;
                      return (
                        <Circle
                          key={c.id}
                          cx={c.x}
                          cy={c.y}
                          r={r}
                          fill={t.colors.primary}
                          stroke={isSelected ? t.colors.surface : t.colors.primaryFg}
                          strokeWidth={isSelected ? 2 : 0}
                        />
                      );
                    })}
                  </Svg>
                </View>

                <View style={{ flexDirection: 'row', height: columnBlockHeight, width: plotWidth }}>
                  {coords.map((c) => {
                    const isSelected = c.id === selectedId;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => setSelectedId((prev) => (prev === c.id ? null : c.id))}
                        style={{ width: colWidth || COL_WIDTH, height: columnBlockHeight }}
                        accessibilityRole="button"
                        accessibilityLabel={`${dayOfMonth(c.date)}일 ${c.weightKg}킬로그램`}
                      >
                        <View style={{ height: RANGE_PANEL_HEIGHT }} />
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
                            >
                              {dayOfMonth(c.date) || '·'}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </ScrollView>
        </View>

        {bandHigh != null && bandHigh > 0 ? (
          <View
            style={{
              width: RANGE_LABEL_GUTTER,
              height: columnBlockHeight,
              marginTop: RANGE_TOOLTIP_SLOT_HEIGHT + t.spacing.xs,
              position: 'relative',
            }}
          >
            <PanelGutterLabels goals={goals} unit="kg" color={t.colors.fgMuted} panelTop={0} />
          </View>
        ) : null}
      </View>

      {bandLow != null && bandHigh != null ? (
        <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>{WEIGHT_COPY.chartBandLegend}</Text>
      ) : null}
    </View>
  );
}
