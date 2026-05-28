import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme';

const PORTION_MIN = 0.25;
const PORTION_MAX = 50;
const PORTION_STEP = 0.5;

function formatPortionDisplay(qty: number): string {
  const rounded = Math.round(qty * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function clampPortion(qty: number): number {
  return Math.min(PORTION_MAX, Math.max(PORTION_MIN, Math.round(qty * 100) / 100));
}

export function nextPortionQty(current: number, delta: number): number | null {
  const next = clampPortion(current + delta);
  if (Math.abs(next - current) < 0.001) return null;
  return next;
}

type Props = {
  quantity: number;
  unitLabel?: string;
  disabled?: boolean;
  busy?: boolean;
  onChange: (nextQty: number) => void;
  onPressCurrent?: () => void;
};

export function MealPortionStepper({
  quantity,
  unitLabel,
  disabled,
  busy,
  onChange,
  onPressCurrent,
}: Props) {
  const t = useTheme();
  const display = formatPortionDisplay(quantity);
  const atMin = quantity <= PORTION_MIN;
  const atMax = quantity >= PORTION_MAX;

  const btnStyle = {
    width: 36,
    height: 36,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs }}>
      <Pressable
        onPress={() => {
          const next = nextPortionQty(quantity, -PORTION_STEP);
          if (next != null) onChange(next);
        }}
        disabled={disabled || busy || atMin}
        style={({ pressed }) => [
          btnStyle,
          (disabled || busy || atMin) && { opacity: 0.4 },
          pressed && !(disabled || busy || atMin) && { opacity: 0.85 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="분량 줄이기"
      >
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>−</Text>
      </Pressable>
      <Pressable
        onPress={onPressCurrent}
        disabled={disabled || busy || !onPressCurrent}
        style={({ pressed }) => ({
          minWidth: 52,
          alignItems: 'center',
          opacity: pressed && !disabled && !busy && onPressCurrent ? 0.85 : 1,
        })}
      >
        {busy ? (
          <ActivityIndicator color={t.colors.primary} size="small" />
        ) : (
          <>
            <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '700' }}>{display}</Text>
            {unitLabel ? (
              <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>{unitLabel}</Text>
            ) : null}
          </>
        )}
      </Pressable>
      <Pressable
        onPress={() => {
          const next = nextPortionQty(quantity, PORTION_STEP);
          if (next != null) onChange(next);
        }}
        disabled={disabled || busy || atMax}
        style={({ pressed }) => [
          btnStyle,
          (disabled || busy || atMax) && { opacity: 0.4 },
          pressed && !(disabled || busy || atMax) && { opacity: 0.85 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="분량 늘리기"
      >
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>+</Text>
      </Pressable>
    </View>
  );
}

export function canAdjustPortionInList(meal: {
  foodTemplateId?: string | null;
  mealInputMode?: string | null;
}): boolean {
  if (meal.foodTemplateId) {
    return meal.mealInputMode !== 'TOTAL_GRAMS';
  }
  return true;
}
