import { View } from 'react-native';

/** Line segment between two points (no native SVG). */
export function LineSegment({
  x1,
  y1,
  x2,
  y2,
  color,
  thickness = 2,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  thickness?: number;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length < 1) return null;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: length,
        height: thickness,
        left: midX - length / 2,
        top: midY - thickness / 2,
        backgroundColor: color,
        transform: [{ rotate: `${angleDeg}deg` }],
      }}
    />
  );
}

export function PlotDot({
  cx,
  cy,
  radius,
  fill,
  stroke,
  strokeWidth = 0,
}: {
  cx: number;
  cy: number;
  radius: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}) {
  const size = radius * 2;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: cx - radius,
        top: cy - radius,
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: fill,
        borderWidth: strokeWidth,
        borderColor: stroke,
      }}
    />
  );
}
