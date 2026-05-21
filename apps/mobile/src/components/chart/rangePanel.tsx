import { Text, View } from 'react-native';

export const RANGE_PANEL_HEIGHT = 108;
export const RANGE_DAY_LABEL_HEIGHT = 36;
export const RANGE_BAR_WIDTH_MAX = 14;
export const RANGE_LABEL_GUTTER = 64;
export const RANGE_TOOLTIP_SLOT_HEIGHT = 88;
export const RANGE_MIN_GUTTER_LABEL_GAP = 28;

export type PanelGoals = {
  low: number | null;
  high: number | null;
  scaleMax: number;
};

export function valueToHeight(value: number, scaleMax: number, panelHeight = RANGE_PANEL_HEIGHT): number {
  if (!Number.isFinite(value) || scaleMax <= 0) return 0;
  return Math.max(0, (value / scaleMax) * panelHeight);
}

export function DashedGuideLine({ top, width, color }: { top: number; width: number; color: string }) {
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

export function PanelBands({
  goals,
  plotWidth,
  bandColor,
  lineHighColor,
  lineLowColor,
  panelHeight = RANGE_PANEL_HEIGHT,
}: {
  goals: PanelGoals;
  plotWidth: number;
  bandColor: string;
  lineHighColor: string;
  lineLowColor: string;
  panelHeight?: number;
}) {
  const { low, high, scaleMax } = goals;
  const bandTopY =
    high != null && high > 0 ? panelHeight - valueToHeight(high, scaleMax, panelHeight) : null;
  const bandBottomY =
    low != null && low > 0 ? panelHeight - valueToHeight(low, scaleMax, panelHeight) : null;
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

export function PanelGutterLabels({
  goals,
  unit,
  color,
  panelTop,
  panelHeight = RANGE_PANEL_HEIGHT,
  formatGoalRangeLabel,
}: {
  goals: PanelGoals;
  unit: string;
  color: string;
  panelTop: number;
  panelHeight?: number;
  formatGoalRangeLabel?: (low: number, high: number, unit: string) => string;
}) {
  const { low, high, scaleMax } = goals;
  const bandTopY =
    high != null && high > 0 ? panelHeight - valueToHeight(high, scaleMax, panelHeight) : null;
  const bandBottomY =
    low != null && low > 0 ? panelHeight - valueToHeight(low, scaleMax, panelHeight) : null;

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
  if (bandHeight < RANGE_MIN_GUTTER_LABEL_GAP) {
    const label = formatGoalRangeLabel
      ? formatGoalRangeLabel(Math.round(low), Math.round(high), unit)
      : `${Math.round(low)}~${Math.round(high)}${unit}`;
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
        {label}
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
          top: panelTop + Math.min(panelHeight - 12, Math.max(0, bandBottomY - 8)),
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
