import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/// PRD §10 N7=a 결정. Android 알림 채널 2개 분리.
export const CHANNEL_MEAL = 'meal-reminder';
export const CHANNEL_NUTRITION = 'nutrition-reminder';

let didSetup = false;

/// 부팅 시 한 번만 호출. 다중 호출은 no-op.
/// - 포그라운드 알림 핸들러 (사용자가 앱을 켜고 있어도 배너/소리 노출)
/// - Android 알림 채널 2개 등록 (PRD §10 N7=a)
export async function setupNotifications(): Promise<void> {
  if (didSetup) return;
  didSetup = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_MEAL, {
      name: '식사 시간 알림',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      vibrationPattern: [0, 200, 200, 200],
      lightColor: '#16a34a',
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_NUTRITION, {
      name: '권장량 미달 알림',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      vibrationPattern: [0, 200, 200, 200],
      lightColor: '#16a34a',
    });
  }
}

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function getNotifPermissionState(): Promise<PermissionState> {
  const r = await Notifications.getPermissionsAsync();
  if (r.granted) return 'granted';
  if (r.canAskAgain) return 'undetermined';
  return 'denied';
}

export async function requestNotifPermission(): Promise<PermissionState> {
  const r = await Notifications.requestPermissionsAsync();
  if (r.granted) return 'granted';
  if (r.canAskAgain) return 'undetermined';
  return 'denied';
}
