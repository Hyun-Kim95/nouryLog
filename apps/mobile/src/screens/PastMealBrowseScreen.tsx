import { useCallback, useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { deactivateMeal } from '../api/meals';
import type { MealRow } from '../api/meals';
import { isAuthDenied } from '../api';
import { ensureAccessToken } from '../authSession';
import { KstMonthCalendar } from '../components/KstMonthCalendar';
import { MealDayTimelineCard } from '../components/MealDayTimelineCard';
import { MealEditModal } from '../components/MealEditModal';
import { ScreenLayout } from '../components/ui';
import { LOG_COPY } from '../copy/log';
import { formatKstDayTitle, kstMonthBoundsFromYm, mealDatesKstFromRows, ymFromYmd } from '../lib/dateRange';
import { fetchAllMealsInRange } from '../lib/fetchMealsInRange';
import { todayAnchorKst } from '../lib/statsPeriod';
import { useTheme } from '../theme';
import { useToast } from '../toast/useToast';

export function PastMealBrowseScreen() {
  const t = useTheme();
  const toast = useToast();
  const [selectedYmd, setSelectedYmd] = useState(() => todayAnchorKst());
  const [visibleYm, setVisibleYm] = useState(() => ymFromYmd(todayAnchorKst()));
  const [recordedDates, setRecordedDates] = useState<string[]>([]);
  const [reloadToken, setReloadToken] = useState(0);
  const [editingMeal, setEditingMeal] = useState<MealRow | null>(null);

  const loadMonthDots = useCallback(async (ym: string) => {
    try {
      const token = await ensureAccessToken();
      if (!token) return;
      const { from, to } = kstMonthBoundsFromYm(ym);
      const meals = await fetchAllMealsInRange(token, from, to);
      setRecordedDates(mealDatesKstFromRows(meals));
    } catch (e) {
      if (isAuthDenied(e)) return;
      setRecordedDates([]);
    }
  }, []);

  useEffect(() => {
    void loadMonthDots(visibleYm);
  }, [visibleYm, reloadToken, loadMonthDots]);

  const bumpReload = useCallback(() => {
    setReloadToken((n) => n + 1);
    void loadMonthDots(visibleYm);
  }, [visibleYm, loadMonthDots]);

  const handleSelectYmd = (ymd: string) => {
    setSelectedYmd(ymd);
    const ym = ymFromYmd(ymd);
    if (ym !== visibleYm) setVisibleYm(ym);
  };

  const handleMonthChange = (ym: string) => {
    setVisibleYm(ym);
  };

  const handleDelete = (item: MealRow) => {
    Alert.alert(LOG_COPY.deleteConfirmTitle, LOG_COPY.deleteConfirmBody, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => void confirmDelete(item),
      },
    ]);
  };

  const confirmDelete = async (item: MealRow) => {
    try {
      const token = await ensureAccessToken();
      if (!token) throw new Error('로그인 필요');
      await deactivateMeal(token, item.mealId);
      toast.show({ kind: 'success', message: LOG_COPY.deleteSuccess });
      bumpReload();
    } catch (e) {
      if (isAuthDenied(e)) return;
      toast.show({ kind: 'error', message: e instanceof Error ? e.message : '삭제 실패' });
    }
  };

  return (
    <>
      <ScreenLayout scroll>
        <KstMonthCalendar
          selectedYmd={selectedYmd}
          onSelectYmd={handleSelectYmd}
          recordedDates={recordedDates}
          onMonthChange={handleMonthChange}
        />
        <Text
          style={{
            color: t.colors.fg,
            fontSize: t.fontSize.body,
            fontWeight: '600',
            marginTop: t.spacing.md,
          }}
        >
          {formatKstDayTitle(selectedYmd)}
        </Text>
        <View style={{ marginTop: t.spacing.sm, gap: t.spacing.md }}>
          <MealDayTimelineCard
            date={selectedYmd}
            reloadToken={reloadToken}
            onEdit={setEditingMeal}
            onDelete={handleDelete}
          />
        </View>
      </ScreenLayout>

      <MealEditModal
        visible={editingMeal != null}
        meal={editingMeal}
        onClose={() => setEditingMeal(null)}
        onSaved={bumpReload}
      />
    </>
  );
}
