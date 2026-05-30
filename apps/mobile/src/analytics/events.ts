export const AnalyticsEvents = {
  appOpened: 'app_opened',
  loginCompleted: 'login_completed',
  onboardingCompleted: 'onboarding_completed',
  mealRecorded: 'meal_recorded',
  ocrStarted: 'ocr_started',
  ocrCompleted: 'ocr_completed',
  statsViewed: 'stats_viewed',
  paywallShown: 'paywall_shown',
  screenView: '$screen_view',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

export type MealInputModeAnalytics = 'template' | 'manual' | 'ocr';

export type OcrSource = 'camera' | 'library';

export type StatsPeriodAnalytics = 'day' | 'week' | 'month';

export type PaywallTriggerAnalytics =
  | 'ocr_exhausted'
  | 'ocr_quota_exceeded'
  | 'ocr_remaining_gate';
