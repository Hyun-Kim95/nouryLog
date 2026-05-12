import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { CHANNEL_MEAL, CHANNEL_NUTRITION } from './channels';

export { CHANNEL_MEAL, CHANNEL_NUTRITION } from './channels';

let didSetup = false;

/// 부팅 시 한 번만 호출. 다중 호출은 no-op.
/// Expo Go에서는 `expo-notifications` 네이티브 제한으로 모듈을 로드하지 않는다(SDK 53+ 안내 로그 방지).
export async function setupNotifications(): Promise<void> {
  if (didSetup) return;
  didSetup = true;
  if (isRunningInExpoGo()) return;

  const Notifications = await import('expo-notifications');
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
  if (isRunningInExpoGo()) return 'denied';
  const Notifications = await import('expo-notifications');
  const r = await Notifications.getPermissionsAsync();
  if (r.granted) return 'granted';
  if (r.canAskAgain) return 'undetermined';
  return 'denied';
}

export async function requestNotifPermission(): Promise<PermissionState> {
  if (isRunningInExpoGo()) return 'denied';
  const Notifications = await import('expo-notifications');
  const r = await Notifications.requestPermissionsAsync();
  if (r.granted) return 'granted';
  if (r.canAskAgain) return 'undetermined';
  return 'denied';
}
