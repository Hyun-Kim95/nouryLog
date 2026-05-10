import * as SecureStore from 'expo-secure-store';

/// PRD `feature-mobile-notifications-prd.md` v0.2 §6.1 키 6개. 결정 N6=a SecureStore-only.
const KEY_MEAL_ENABLED = 'dm_notif_meal_enabled';
const KEY_MEAL_BREAKFAST = 'dm_notif_meal_breakfast';
const KEY_MEAL_LUNCH = 'dm_notif_meal_lunch';
const KEY_MEAL_DINNER = 'dm_notif_meal_dinner';
const KEY_NUTRITION_ENABLED = 'dm_notif_nutrition_enabled';
const KEY_NUTRITION_TIME = 'dm_notif_nutrition_time';

/// "HH:mm" 24h 포맷. 5분 단위 권장(스펙 §2.3)이지만 본 모듈은 형식만 검증한다.
export type TimeStr = string;

export type MealKey = 'breakfast' | 'lunch' | 'dinner';

/// PRD §10 N2=a 결정. 사용자가 미설정 + 첫 ON 시 적용된다.
export const DEFAULT_MEAL_TIME: Record<MealKey, TimeStr> = {
  breakfast: '08:00',
  lunch: '12:30',
  dinner: '18:30',
};

/// PRD §10 N4=20:00 사용자 결정.
export const DEFAULT_NUTRITION_TIME: TimeStr = '20:00';

const MEAL_KEY_MAP: Record<MealKey, string> = {
  breakfast: KEY_MEAL_BREAKFAST,
  lunch: KEY_MEAL_LUNCH,
  dinner: KEY_MEAL_DINNER,
};

function isTimeStr(v: string | null): v is TimeStr {
  if (!v) return false;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
}

async function getBool(key: string): Promise<boolean | null> {
  try {
    const v = await SecureStore.getItemAsync(key);
    if (v === 'true') return true;
    if (v === 'false') return false;
    return null;
  } catch (e) {
    if (__DEV__) console.warn(`[notifPrefs] getBool(${key}) failed`, e);
    return null;
  }
}

async function setBool(key: string, v: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, v ? 'true' : 'false');
  } catch (e) {
    if (__DEV__) console.warn(`[notifPrefs] setBool(${key}) failed`, e);
  }
}

async function getTime(key: string): Promise<TimeStr | null> {
  try {
    const v = await SecureStore.getItemAsync(key);
    return isTimeStr(v) ? v : null;
  } catch (e) {
    if (__DEV__) console.warn(`[notifPrefs] getTime(${key}) failed`, e);
    return null;
  }
}

async function setTime(key: string, v: TimeStr): Promise<void> {
  if (!isTimeStr(v)) {
    if (__DEV__) console.warn(`[notifPrefs] setTime(${key}) invalid:`, v);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, v);
  } catch (e) {
    if (__DEV__) console.warn(`[notifPrefs] setTime(${key}) failed`, e);
  }
}

export async function getMealEnabled(): Promise<boolean | null> {
  return getBool(KEY_MEAL_ENABLED);
}
export async function setMealEnabled(v: boolean): Promise<void> {
  return setBool(KEY_MEAL_ENABLED, v);
}

export async function getMealTime(meal: MealKey): Promise<TimeStr | null> {
  return getTime(MEAL_KEY_MAP[meal]);
}
export async function setMealTime(meal: MealKey, v: TimeStr): Promise<void> {
  return setTime(MEAL_KEY_MAP[meal], v);
}

/// 미설정 시 PRD 기본값 반환. UI 노출 시 사용.
export async function getMealTimeOrDefault(meal: MealKey): Promise<TimeStr> {
  return (await getMealTime(meal)) ?? DEFAULT_MEAL_TIME[meal];
}

export async function getNutritionEnabled(): Promise<boolean | null> {
  return getBool(KEY_NUTRITION_ENABLED);
}
export async function setNutritionEnabled(v: boolean): Promise<void> {
  return setBool(KEY_NUTRITION_ENABLED, v);
}

export async function getNutritionTime(): Promise<TimeStr | null> {
  return getTime(KEY_NUTRITION_TIME);
}
export async function setNutritionTime(v: TimeStr): Promise<void> {
  return setTime(KEY_NUTRITION_TIME, v);
}

export async function getNutritionTimeOrDefault(): Promise<TimeStr> {
  return (await getNutritionTime()) ?? DEFAULT_NUTRITION_TIME;
}

/// "모두 끄기" 일괄 처리. 시간 키는 보존(다음 ON 시 재사용 — 디자인 스펙 §3.4).
export async function disableAll(): Promise<void> {
  await Promise.all([
    setBool(KEY_MEAL_ENABLED, false),
    setBool(KEY_NUTRITION_ENABLED, false),
  ]);
}

export type NotifPrefsSnapshot = {
  mealEnabled: boolean | null;
  mealTimes: Record<MealKey, TimeStr>;
  nutritionEnabled: boolean | null;
  nutritionTime: TimeStr;
};

/// 한 번에 모든 prefs를 로드(미설정은 기본값 적용).
export async function loadAllNotifPrefs(): Promise<NotifPrefsSnapshot> {
  const [mealEnabled, breakfast, lunch, dinner, nutritionEnabled, nutritionTime] = await Promise.all([
    getMealEnabled(),
    getMealTimeOrDefault('breakfast'),
    getMealTimeOrDefault('lunch'),
    getMealTimeOrDefault('dinner'),
    getNutritionEnabled(),
    getNutritionTimeOrDefault(),
  ]);
  return {
    mealEnabled,
    mealTimes: { breakfast, lunch, dinner },
    nutritionEnabled,
    nutritionTime,
  };
}

export function parseTimeStr(v: TimeStr): { hour: number; minute: number } {
  const [h, m] = v.split(':');
  return { hour: Number(h), minute: Number(m) };
}

export function formatTimeStr(hour: number, minute: number): TimeStr {
  const h = String(hour).padStart(2, '0');
  const m = String(minute).padStart(2, '0');
  return `${h}:${m}`;
}
