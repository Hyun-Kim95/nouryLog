import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme';
import {
  MEAL_GRAMS_STEP,
  nextMealGrams,
} from '../lib/adjustMealGramsCore';
import {
  MEAL_PORTION_QTY_MAX,
  MEAL_PORTION_QTY_MIN,
  MEAL_PORTION_STEP,
  formatListMealQuantity,
  nextMealPortionQuantity,
  type ListMealStepMode,
} from '../lib/listMealQuantityDisplay';
import {
  NUTRITION_FOOD_GRAMS_MAX,
  NUTRITION_FOOD_GRAMS_MIN,
} from '../lib/nutritionFoodScale';

type Props = {
  /** Current quantity (grams or portion count depending on stepMode). */
  quantity: number;
  unitLabel?: string;
  stepMode?: ListMealStepMode;
  disabled?: boolean;
  busy?: boolean;
  onChange: (nextQuantity: number) => void;
  onPressCurrent?: () => void;
};

/** −/+ for list: grams ±10 or PORTION_COUNT ±1. */
export function MealPortionStepper({
  quantity,
  unitLabel = 'g',
  stepMode = 'grams',
  disabled,
  busy,
  onChange,
  onPressCurrent,
}: Props) {
  const t = useTheme();
  const display = formatListMealQuantity(quantity);
  const atMin =
    stepMode === 'portion'
      ? quantity <= MEAL_PORTION_QTY_MIN
      : quantity <= NUTRITION_FOOD_GRAMS_MIN;
  const atMax =
    stepMode === 'portion'
      ? quantity >= MEAL_PORTION_QTY_MAX
      : quantity >= NUTRITION_FOOD_GRAMS_MAX;

  const decLabel = stepMode === 'portion' ? '1단위 감소' : '10그램 감소';
  const incLabel = stepMode === 'portion' ? '1단위 증가' : '10그램 증가';

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
          const next =
            stepMode === 'portion'
              ? nextMealPortionQuantity(quantity, -MEAL_PORTION_STEP)
              : nextMealGrams(quantity, -MEAL_GRAMS_STEP);
          if (next != null) onChange(next);
        }}
        disabled={disabled || busy || atMin}
        style={({ pressed }) => [
          btnStyle,
          (disabled || busy || atMin) && { opacity: 0.4 },
          pressed && !(disabled || busy || atMin) && { opacity: 0.85 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={decLabel}
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
          const next =
            stepMode === 'portion'
              ? nextMealPortionQuantity(quantity, MEAL_PORTION_STEP)
              : nextMealGrams(quantity, MEAL_GRAMS_STEP);
          if (next != null) onChange(next);
        }}
        disabled={disabled || busy || atMax}
        style={({ pressed }) => [
          btnStyle,
          (disabled || busy || atMax) && { opacity: 0.4 },
          pressed && !(disabled || busy || atMax) && { opacity: 0.85 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={incLabel}
      >
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>+</Text>
      </Pressable>
    </View>
  );
}

export function canAdjustPortionInList(meal: {
  grams?: number | null;
  foodTemplateId?: string | null;
  mealInputMode?: string | null;
  portionQuantity?: number | null;
}): boolean {
  if (
    meal.foodTemplateId &&
    meal.mealInputMode === 'PORTION_COUNT' &&
    meal.portionQuantity != null &&
    Number.isFinite(meal.portionQuantity) &&
    meal.portionQuantity > 0
  ) {
    return true;
  }
  return meal.grams != null && Number.isFinite(meal.grams) && meal.grams > 0;
}
