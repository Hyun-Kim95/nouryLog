import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { listMeals, type MealRow } from '../api/meals';
import { isAuthDenied } from '../api';
import { ensureAccessToken } from '../authSession';
import { Banner, Card, CardTitle } from './ui';
import { LOG_COPY } from '../copy/log';
import { kstDayBoundsFromYmd } from '../lib/dateRange';
import { formatMacroLine } from '../lib/formatNutrition';
import { groupMealsBySlotTimeline, mealRowSubtitle } from '../lib/mealTimeline';
import { useTheme } from '../theme';

function sumMeals(meals: MealRow[]) {
  let calories = 0;
  let protein = 0;
  let carbohydrate = 0;
  let fat = 0;
  for (const m of meals) {
    calories += Number(m.calories ?? 0);
    protein += Number(m.protein ?? 0);
    carbohydrate += Number(m.carbohydrate ?? 0);
    fat += Number(m.fat ?? 0);
  }
  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbohydrate: Math.round(carbohydrate),
    fat: Math.round(fat),
  };
}

type Props = {
  date: string;
  reloadToken?: number;
  onEdit: (item: MealRow) => void;
  onDelete: (item: MealRow) => void;
};

export function MealDayTimelineCard({ date, reloadToken = 0, onEdit, onDelete }: Props) {
  const t = useTheme();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [meals, setMeals] = useState<MealRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const token = await ensureAccessToken();
      if (!token) return;
      const { from, to } = kstDayBoundsFromYmd(date);
      const res = await listMeals(token, { page: 1, size: 100, from, to });
      setMeals(res.items ?? []);
    } catch (e) {
      if (isAuthDenied(e)) return;
      setMeals([]);
      setErr(e instanceof Error ? e.message : LOG_COPY.mealDayLoadError);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  const timeline = useMemo(() => groupMealsBySlotTimeline(meals), [meals]);
  const hasMeals = timeline.some((s) => s.items.length > 0);
  const summary = useMemo(() => sumMeals(meals), [meals]);

  if (loading) {
    return (
      <View style={{ paddingVertical: t.spacing.xl, alignItems: 'center' }}>
        <ActivityIndicator color={t.colors.primary} />
      </View>
    );
  }

  if (err) {
    return (
      <Banner variant="danger" actionLabel={LOG_COPY.mealDayRetry} onAction={() => void load()}>
        {err}
      </Banner>
    );
  }

  if (!hasMeals) {
    return (
      <Card>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>{LOG_COPY.mealDayEmpty}</Text>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardTitle>{LOG_COPY.mealDaySummaryTitle}</CardTitle>
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>
          {summary.calories} kcal
        </Text>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>
          단백질 {summary.protein}g · 탄수 {summary.carbohydrate}g · 지방 {summary.fat}g
        </Text>
      </Card>

      <Card>
        {timeline.map((section) =>
          section.items.length === 0 ? null : (
            <View key={section.kind} style={{ marginBottom: t.spacing.md }}>
              <Text
                style={{
                  color: t.colors.fg,
                  fontSize: t.fontSize.body,
                  fontWeight: '700',
                  marginBottom: t.spacing.xs,
                }}
              >
                {section.title} · {section.summaryKcal} kcal
              </Text>
              {section.items.map((item) => (
                <View
                  key={item.mealId}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: t.spacing.md,
                    paddingVertical: t.spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: t.colors.border,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
                      {mealRowSubtitle(item)}
                    </Text>
                    <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                      {item.calories} kcal · {formatMacroLine(item)}
                    </Text>
                  </View>
                  <View style={{ flexShrink: 0, gap: t.spacing.sm, minWidth: 76 }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={LOG_COPY.pastEdit}
                      onPress={() => onEdit(item)}
                      style={({ pressed }) => ({
                        paddingVertical: t.spacing.sm,
                        paddingHorizontal: t.spacing.md,
                        borderRadius: t.radius.md,
                        borderWidth: 1,
                        borderColor: t.colors.border,
                        backgroundColor: pressed ? t.colors.surface2 : t.colors.surface,
                        alignItems: 'center',
                      })}
                    >
                      <Text style={{ color: t.colors.info, fontWeight: '700', fontSize: t.fontSize.caption }}>
                        {LOG_COPY.pastEdit}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={LOG_COPY.pastDelete}
                      onPress={() => onDelete(item)}
                      style={({ pressed }) => ({
                        paddingVertical: t.spacing.sm,
                        paddingHorizontal: t.spacing.md,
                        borderRadius: t.radius.md,
                        borderWidth: 1,
                        borderColor: t.colors.danger,
                        backgroundColor: pressed ? t.colors.surface2 : t.colors.surface,
                        alignItems: 'center',
                      })}
                    >
                      <Text style={{ color: t.colors.danger, fontWeight: '700', fontSize: t.fontSize.caption }}>
                        {LOG_COPY.pastDelete}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ),
        )}
      </Card>
    </>
  );
}
