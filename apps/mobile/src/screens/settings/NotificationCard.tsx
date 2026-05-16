import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
  type AppStateStatus,
} from 'react-native';
import { Card, CardTitle } from '../../components/ui';
import { useTheme } from '../../theme';
import { useToast } from '../../toast/useToast';
import { getAccessToken } from '../../authStorage';
import {
  getNotifPermissionState,
  requestNotifPermission,
  reconcileScheduledNotifications,
  cancelAllScheduled,
  scheduleAllMeals,
  cancelAllMeals,
  scheduleNutrition,
  cancelNutrition,
  scheduleMeal,
  type PermissionState,
} from '../../notifications';
import { RECOMMENDATION_COPY } from '../../copy/recommendation';
import {
  DEFAULT_MEAL_TIME,
  DEFAULT_NUTRITION_TIME,
  disableAll,
  formatTimeStr,
  getMealEnabled,
  getMealTimeOrDefault,
  getNutritionEnabled,
  getNutritionTimeOrDefault,
  parseTimeStr,
  setMealEnabled,
  setMealTime,
  setNutritionEnabled,
  setNutritionTime,
  type MealKey,
  type TimeStr,
} from '../../notifPrefs';

const MEAL_LABEL: Record<MealKey, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
/// 5분 단위 (디자인 스펙 §2.3).
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

type ModalTarget = { kind: 'meal'; meal: MealKey } | { kind: 'nutrition' };

export function NotificationCard() {
  const t = useTheme();
  const toast = useToast();

  const [permState, setPermState] = useState<PermissionState | 'loading'>('loading');
  const [mealEnabled, setMealEnabledState] = useState<boolean>(false);
  const [mealTimes, setMealTimes] = useState<Record<MealKey, TimeStr>>(DEFAULT_MEAL_TIME);
  const [nutritionEnabled, setNutritionEnabledState] = useState<boolean>(false);
  const [nutritionTime, setNutritionTimeState] = useState<TimeStr>(DEFAULT_NUTRITION_TIME);
  const [modal, setModal] = useState<ModalTarget | null>(null);

  /// 0번째 마운트 + AppState `active` 진입 시 권한·prefs 재조회 후 reconcile.
  /// AppState foreground 진입은 OS 설정에서 권한이 변경된 케이스도 잡아낸다(스펙 §2.2.5 / §3.6).
  const refresh = useCallback(async (opts: { reconcile: boolean } = { reconcile: false }) => {
    const [state, mEn, b, l, d, nEn, nT] = await Promise.all([
      getNotifPermissionState(),
      getMealEnabled(),
      getMealTimeOrDefault('breakfast'),
      getMealTimeOrDefault('lunch'),
      getMealTimeOrDefault('dinner'),
      getNutritionEnabled(),
      getNutritionTimeOrDefault(),
    ]);

    /// granted → denied 전환 감지: 토글 자동 OFF + OS 알림 취소 (스펙 §3.6).
    if (state === 'denied' && (mEn === true || nEn === true)) {
      await disableAll();
      await cancelAllScheduled();
      setPermState('denied');
      setMealEnabledState(false);
      setNutritionEnabledState(false);
      setMealTimes({ breakfast: b, lunch: l, dinner: d });
      setNutritionTimeState(nT);
      return;
    }

    setPermState(state);
    setMealEnabledState(mEn === true);
    setMealTimes({ breakfast: b, lunch: l, dinner: d });
    setNutritionEnabledState(nEn === true);
    setNutritionTimeState(nT);

    if (opts.reconcile && state === 'granted') {
      const token = await getAccessToken();
      await reconcileScheduledNotifications(token).catch((e) => {
        if (__DEV__) console.warn('[NotificationCard] reconcile failed', e);
      });
    }
  }, []);

  useEffect(() => {
    void refresh({ reconcile: true });
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'active') void refresh({ reconcile: true });
    });
    return () => sub.remove();
  }, [refresh]);

  const onPressEnableNotifications = async () => {
    const next = await requestNotifPermission();
    setPermState(next);
    if (next === 'granted') {
      toast.show({ kind: 'info', message: '알림을 사용할 수 있어요. 토글을 켜서 시작해보세요.' });
    } else if (next === 'denied') {
      toast.show({ kind: 'info', message: '알림 권한이 거부됐어요. 기기 설정에서 다시 켤 수 있어요.' });
    }
  };

  const onOpenSystemSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '기기 설정을 여는 중 오류가 발생했어요.';
      toast.show({ kind: 'error', message: msg });
    }
  };

  const onToggleMeal = async (next: boolean) => {
    setMealEnabledState(next);
    await setMealEnabled(next);
    if (next) {
      try {
        await scheduleAllMeals(mealTimes);
        toast.show({ kind: 'info', message: '식사 시간 알림을 켰어요.' });
      } catch (e) {
        const msg = e instanceof Error ? e.message : '알림을 설정하는 중 오류가 발생했어요.';
        toast.show({ kind: 'error', message: msg });
        setMealEnabledState(false);
        await setMealEnabled(false);
      }
    } else {
      await cancelAllMeals();
      toast.show({ kind: 'info', message: '식사 시간 알림을 껐어요.' });
    }
  };

  const onToggleNutrition = async (next: boolean) => {
    setNutritionEnabledState(next);
    await setNutritionEnabled(next);
    if (next) {
      try {
        const token = await getAccessToken();
        await scheduleNutrition(nutritionTime, token);
        toast.show({ kind: 'info', message: '권장량 미달 알림을 켰어요.' });
      } catch (e) {
        const msg = e instanceof Error ? e.message : '알림을 설정하는 중 오류가 발생했어요.';
        toast.show({ kind: 'error', message: msg });
        setNutritionEnabledState(false);
        await setNutritionEnabled(false);
      }
    } else {
      await cancelNutrition();
      toast.show({ kind: 'info', message: '권장량 미달 알림을 껐어요.' });
    }
  };

  const onDisableAll = () => {
    if (!mealEnabled && !nutritionEnabled) {
      toast.show({ kind: 'info', message: '이미 모두 꺼져있어요.' });
      return;
    }
    Alert.alert(
      '알림을 모두 끌까요?',
      '켜진 식사 알림과 권장량 미달 알림이 즉시 취소됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '모두 끄기',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await disableAll();
                await cancelAllScheduled();
                setMealEnabledState(false);
                setNutritionEnabledState(false);
                toast.show({ kind: 'info', message: '알림을 모두 껐어요.' });
              } catch (e) {
                const msg = e instanceof Error ? e.message : '알림을 끄는 중 오류가 발생했어요.';
                toast.show({ kind: 'error', message: msg });
              }
            })();
          },
        },
      ],
      { cancelable: true },
    );
  };

  const onSaveTime = async (next: TimeStr) => {
    if (!modal) return;
    if (modal.kind === 'meal') {
      const meal = modal.meal;
      setMealTimes((prev) => ({ ...prev, [meal]: next }));
      await setMealTime(meal, next);
      if (mealEnabled) {
        await scheduleMeal(meal, next).catch(() => {
          /* 스케줄링 실패 시도 무시 — 사용자에게 토스트만 노출. */
        });
      }
      toast.show({ kind: 'info', message: '시간을 변경했어요.' });
    } else {
      setNutritionTimeState(next);
      await setNutritionTime(next);
      if (nutritionEnabled) {
        const token = await getAccessToken();
        await scheduleNutrition(next, token).catch(() => undefined);
      }
      toast.show({ kind: 'info', message: '시간을 변경했어요.' });
    }
    setModal(null);
  };

  /// 상태 D — 로딩 (짧음, 50ms 이내 보통). 깜빡 방지 위해 단순 박스만.
  if (permState === 'loading') {
    return (
      <Card>
        <CardTitle>알림</CardTitle>
        <View
          style={{
            height: 16,
            backgroundColor: t.colors.surface2,
            borderRadius: t.radius.sm,
          }}
        />
      </Card>
    );
  }

  /// 상태 A — 권한 결정 안 됨.
  if (permState === 'undetermined') {
    return (
      <Card>
        <CardTitle>알림</CardTitle>
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body }}>
          식사 시간과 권장량 미달을 알려드릴까요?
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="알림 켜기. 권한 요청을 시작합니다."
          onPress={onPressEnableNotifications}
          style={({ pressed }) => ({
            backgroundColor: t.colors.primary,
            borderRadius: t.radius.md,
            paddingVertical: t.spacing.md,
            alignItems: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: t.colors.primaryFg, fontWeight: '700', fontSize: t.fontSize.body }}>
            알림 켜기
          </Text>
        </Pressable>
      </Card>
    );
  }

  /// 상태 C / E — 권한 거부 (자동 OFF 부수효과는 refresh에서 이미 처리).
  if (permState === 'denied') {
    return (
      <Card>
        <CardTitle>알림</CardTitle>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>
          알림이 꺼져있어요.
        </Text>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>
          기기 설정에서 알림을 켜주세요.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="기기 설정 열기. 알림 권한을 다시 설정하려면 탭하세요."
          onPress={onOpenSystemSettings}
          style={({ pressed }) => ({
            borderColor: t.colors.border,
            borderWidth: 1,
            borderRadius: t.radius.md,
            paddingVertical: t.spacing.md,
            alignItems: 'center',
            backgroundColor: t.colors.surface,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: t.colors.fg, fontWeight: '700', fontSize: t.fontSize.body }}>
            기기 설정 열기
          </Text>
        </Pressable>
      </Card>
    );
  }

  /// 상태 B — 권한 허용.
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <CardTitle>알림</CardTitle>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="알림 모두 끄기 (위험)"
          onPress={onDisableAll}
          hitSlop={8}
        >
          <Text style={{ color: t.colors.danger, fontSize: t.fontSize.caption, fontWeight: '700' }}>
            모두 끄기
          </Text>
        </Pressable>
      </View>

      {/* 식사 시간 알림 */}
      <ToggleRow
        label="식사 시간 알림"
        value={mealEnabled}
        onChange={onToggleMeal}
      />
      <View style={{ opacity: mealEnabled ? 1 : 0.5 }}>
        {(['breakfast', 'lunch', 'dinner'] as MealKey[]).map((meal) => (
          <TimeRow
            key={meal}
            label={MEAL_LABEL[meal]}
            time={mealTimes[meal]}
            disabled={!mealEnabled}
            onPress={() => setModal({ kind: 'meal', meal })}
          />
        ))}
      </View>

      {/* 권장량 미달 알림 */}
      <View style={{ height: 1, backgroundColor: t.colors.border, marginVertical: t.spacing.xs }} />
      <ToggleRow
        label="권장량 미달 알림"
        value={nutritionEnabled}
        onChange={onToggleNutrition}
      />
      <Text
        style={{
          color: t.colors.fgSubtle,
          fontSize: t.fontSize.caption,
          paddingHorizontal: t.spacing.md,
          paddingTop: 2,
          paddingBottom: t.spacing.xs,
        }}
      >
        {RECOMMENDATION_COPY.notifHelper}
      </Text>
      <View style={{ opacity: nutritionEnabled ? 1 : 0.5 }}>
        <TimeRow
          label="매일"
          time={nutritionTime}
          disabled={!nutritionEnabled}
          onPress={() => setModal({ kind: 'nutrition' })}
        />
      </View>

      {modal && (
        <TimePickerModal
          initial={
            modal.kind === 'meal' ? mealTimes[modal.meal] : nutritionTime
          }
          onCancel={() => setModal(null)}
          onSave={onSaveTime}
        />
      )}
    </Card>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: t.spacing.xs,
      }}
    >
      <Text
        accessibilityRole="text"
        style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}
      >
        {label}
      </Text>
      <Switch
        accessibilityRole="switch"
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        thumbColor={value ? t.colors.primary : undefined}
        trackColor={{ false: undefined, true: `${t.colors.primary}66` }}
      />
    </View>
  );
}

function TimeRow({
  label,
  time,
  disabled,
  onPress,
}: {
  label: string;
  time: TimeStr;
  disabled: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, 현재 시간 ${time}, 변경하려면 탭하세요.`}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: t.spacing.sm,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs }}>
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
          {time}
        </Text>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>›</Text>
      </View>
    </Pressable>
  );
}

function TimePickerModal({
  initial,
  onCancel,
  onSave,
}: {
  initial: TimeStr;
  onCancel: () => void;
  onSave: (next: TimeStr) => void;
}) {
  const t = useTheme();
  const initParsed = parseTimeStr(initial);
  /// 분은 5분 단위라 초기값을 가까운 5분 단위로 라운드.
  const [hour, setHour] = useState<number>(initParsed.hour);
  const [minute, setMinute] = useState<number>(
    MINUTES.includes(initParsed.minute) ? initParsed.minute : MINUTES[Math.round(initParsed.minute / 5)] ?? 0,
  );
  const hourRef = useRef<ScrollView | null>(null);
  const minuteRef = useRef<ScrollView | null>(null);
  const ROW_H = 36;

  useEffect(() => {
    /// 마운트 직후 현재 값 위치로 스크롤.
    setTimeout(() => {
      hourRef.current?.scrollTo({ y: hour * ROW_H, animated: false });
      const mIdx = MINUTES.indexOf(minute);
      if (mIdx >= 0) minuteRef.current?.scrollTo({ y: mIdx * ROW_H, animated: false });
    }, 50);
    /// 마운트 1회만 실행 — hour/minute는 초기값이 들어있다.
    /// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      accessibilityViewIsModal
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: t.spacing.lg,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 360,
            backgroundColor: t.colors.surface,
            borderRadius: t.radius.lg,
            padding: t.spacing.lg,
            gap: t.spacing.md,
            borderColor: t.colors.border,
            borderWidth: 1,
          }}
        >
          <Text
            accessibilityRole="header"
            style={{
              color: t.colors.fg,
              fontSize: t.fontSize.title,
              fontWeight: '700',
              textAlign: 'center',
            }}
          >
            시간 선택
          </Text>

          <View style={{ flexDirection: 'row', gap: t.spacing.md, justifyContent: 'center' }}>
            <Column
              ref={hourRef}
              items={HOURS}
              selected={hour}
              onSelect={setHour}
              format={(v) => String(v).padStart(2, '0')}
              accessibilityLabelPrefix="시"
              rowHeight={ROW_H}
            />
            <Text style={{ color: t.colors.fg, fontSize: t.fontSize.title, fontWeight: '700', alignSelf: 'center' }}>
              :
            </Text>
            <Column
              ref={minuteRef}
              items={MINUTES}
              selected={minute}
              onSelect={setMinute}
              format={(v) => String(v).padStart(2, '0')}
              accessibilityLabelPrefix="분"
              rowHeight={ROW_H}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="취소"
              onPress={onCancel}
              style={({ pressed }) => ({
                flex: 1,
                borderColor: t.colors.border,
                borderWidth: 1,
                borderRadius: t.radius.md,
                paddingVertical: t.spacing.md,
                alignItems: 'center',
                backgroundColor: t.colors.surface,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '700' }}>
                취소
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="저장"
              onPress={() => onSave(formatTimeStr(hour, minute))}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: t.colors.primary,
                borderRadius: t.radius.md,
                paddingVertical: t.spacing.md,
                alignItems: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text
                style={{
                  color: t.colors.primaryFg,
                  fontSize: t.fontSize.body,
                  fontWeight: '700',
                }}
              >
                저장
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const Column = forwardRef<
  ScrollView,
  {
    items: number[];
    selected: number;
    onSelect: (v: number) => void;
    format: (v: number) => string;
    accessibilityLabelPrefix: string;
    rowHeight: number;
  }
>(function Column(
  { items, selected, onSelect, format, accessibilityLabelPrefix, rowHeight },
  ref,
) {
  const t = useTheme();
  return (
    <View
      style={{
        height: rowHeight * 5,
        width: 80,
        borderColor: t.colors.border,
        borderWidth: 1,
        borderRadius: t.radius.md,
        backgroundColor: t.colors.surface2,
        overflow: 'hidden',
      }}
    >
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: rowHeight * 2 }}
        snapToInterval={rowHeight}
        decelerationRate="fast"
      >
        {items.map((v) => {
          const isSel = v === selected;
          return (
            <Pressable
              key={v}
              accessibilityRole="button"
              accessibilityLabel={`${accessibilityLabelPrefix} ${format(v)}`}
              onPress={() => onSelect(v)}
              style={{
                height: rowHeight,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: isSel ? t.colors.primary : t.colors.fg,
                  fontSize: t.fontSize.body,
                  fontWeight: isSel ? '700' : '500',
                }}
              >
                {format(v)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});
