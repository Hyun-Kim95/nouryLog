import {
  captureEvent,
  identifyUser,
  initAnalyticsClient,
  resetUser,
  trackScreenView,
} from './client';
import type { AnalyticsEventName } from './events';

export { AnalyticsEvents } from './events';
export type {
  AnalyticsEventName,
  MealInputModeAnalytics,
  OcrSource,
  PaywallTriggerAnalytics,
  StatsPeriodAnalytics,
} from './events';
export { isAnalyticsEnabled } from './config';

export function initAnalytics(): void {
  void initAnalyticsClient();
}

export function track(event: AnalyticsEventName | string, properties?: Record<string, string | number | boolean>): void {
  captureEvent(event, properties);
}

export function identifyAnalyticsUser(userId: string): void {
  identifyUser(userId);
}

export function resetAnalyticsUser(): void {
  void resetUser();
}

export function trackScreen(screenName: string): void {
  trackScreenView(screenName);
}
