import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CHANNEL_MEAL, CHANNEL_NUTRITION } from './setup';
import { buildMealContent, buildNutritionContent } from './messages';
import {
  parseTimeStr,
  type MealKey,
  type TimeStr,
  getMealEnabled,
  getMealTimeOrDefault,
  getNutritionEnabled,
  getNutritionTimeOrDefault,
} from '../notifPrefs';
import { fetchTodayShortfall } from './nutrition';

const MEAL_ID_PREFIX = 'dm-meal-';
const NUTRITION_ID = 'dm-nutrition';

async function cancel(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // expo-notifications cancel은 미존재 ID에서도 throw하지 않지만 안전 가드.
  }
}

async function scheduleDaily(args: {
  identifier: string;
  channelId: string;
  title: string;
  body: string;
  time: TimeStr;
}): Promise<void> {
  await cancel(args.identifier);
  const { hour, minute } = parseTimeStr(args.time);
  await Notifications.scheduleNotificationAsync({
    identifier: args.identifier,
    content: {
      title: args.title,
      body: args.body,
      ...(Platform.OS === 'android' ? { channelId: args.channelId } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function scheduleMeal(meal: MealKey, time: TimeStr): Promise<void> {
  const { title, body } = buildMealContent(meal);
  await scheduleDaily({
    identifier: `${MEAL_ID_PREFIX}${meal}`,
    channelId: CHANNEL_MEAL,
    title,
    body,
    time,
  });
}

export async function cancelMeal(meal: MealKey): Promise<void> {
  await cancel(`${MEAL_ID_PREFIX}${meal}`);
}

export async function scheduleAllMeals(times: Record<MealKey, TimeStr>): Promise<void> {
  await Promise.all([
    scheduleMeal('breakfast', times.breakfast),
    scheduleMeal('lunch', times.lunch),
    scheduleMeal('dinner', times.dinner),
  ]);
}

export async function cancelAllMeals(): Promise<void> {
  await Promise.all([cancelMeal('breakfast'), cancelMeal('lunch'), cancelMeal('dinner')]);
}

/// 권장량 미달 알림 — 동적 본문 (PRD v0.2 §5.3 / §7).
/// `token`이 없으면 페치를 건너뛰고 정적 본문(폴백) 사용.
export async function scheduleNutrition(time: TimeStr, token: string | null): Promise<void> {
  await cancel(NUTRITION_ID);

  let content: { title: string; body: string } | null = null;
  if (token) {
    try {
      const sf = await fetchTodayShortfall(token);
      if (sf) {
        content = buildNutritionContent({
          proteinShortfallG: sf.proteinShortfallG,
          calorieShortfallKcal: sf.calorieShortfallKcal,
        });
      }
    } catch (e) {
      if (__DEV__) console.warn('[scheduleNutrition] shortfall fetch failed', e);
    }
  }

  /// 폴백 — proteinGoalG/calorieGoalKcal 미설정 또는 페치 실패 시 정적 콘텐츠로 발송.
  /// 부족량이 0이면(=충족) content가 null이므로 발송하지 않는다(예약 자체 미등록).
  if (!content) {
    if (token) {
      /// 페치 성공 + 둘 다 충족이면 발송 안 함. content는 null 그대로 유지.
      return;
    }
    content = { title: '오늘 식단 점검', body: '오늘 식단을 점검해보세요.' };
  }

  const { hour, minute } = parseTimeStr(time);
  await Notifications.scheduleNotificationAsync({
    identifier: NUTRITION_ID,
    content: {
      title: content.title,
      body: content.body,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_NUTRITION } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelNutrition(): Promise<void> {
  await cancel(NUTRITION_ID);
}

/// SecureStore 상태 그대로 OS에 동기화. 앱 포그라운드 진입 시 + 권장량/프로필 변경 후 호출.
/// `token`이 있어야 권장량 미달 알림의 동적 본문이 정확히 갱신된다.
export async function reconcileScheduledNotifications(token: string | null): Promise<void> {
  const [mealEnabled, nutritionEnabled] = await Promise.all([
    getMealEnabled(),
    getNutritionEnabled(),
  ]);

  if (mealEnabled === true) {
    const [b, l, d] = await Promise.all([
      getMealTimeOrDefault('breakfast'),
      getMealTimeOrDefault('lunch'),
      getMealTimeOrDefault('dinner'),
    ]);
    await scheduleAllMeals({ breakfast: b, lunch: l, dinner: d });
  } else {
    await cancelAllMeals();
  }

  if (nutritionEnabled === true) {
    const t = await getNutritionTimeOrDefault();
    await scheduleNutrition(t, token);
  } else {
    await cancelNutrition();
  }
}

export async function cancelAllScheduled(): Promise<void> {
  await Promise.all([cancelAllMeals(), cancelNutrition()]);
}
