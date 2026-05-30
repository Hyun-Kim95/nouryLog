export const ERRORS_COPY = {
  network: '네트워크 연결을 확인한 뒤 다시 시도해 주세요.',
  timeout: '서버 응답이 지연되고 있어요. 네트워크를 확인한 뒤 다시 시도해 주세요.',
  login: 'SNS 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.',
  ocr: '사진을 분석하지 못했어요. 다시 시도해 주세요.',
  ocrQuota: '이번 달 무료 사진 분석 한도를 모두 사용했어요.',
  ocrRateLimit: '사진 분석 요청이 많아요. 잠시 후 다시 시도해 주세요.',
  ocrParseFailed: '사진에서 영양 정보를 읽지 못했어요. 다른 사진을 시도해 주세요.',
  ocrUnavailable: '영양 성분 인식 서비스를 일시적으로 사용할 수 없어요. 잠시 후 다시 시도해 주세요.',
  billing: '결제 처리에 실패했어요. 잠시 후 다시 시도해 주세요.',
  billingUnavailable: '지금은 결제를 진행할 수 없어요. 잠시 후 다시 시도해 주세요.',
  meal: '기록을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
  stats: '통계를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
  statsFuture: '미래 기간은 조회할 수 없어요.',
  profile: '프로필을 저장하지 못했어요. 다시 시도해 주세요.',
  support: '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
  settings: '설정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
  generic: '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
} as const;

export type ErrorContext =
  | 'login'
  | 'ocr'
  | 'meal'
  | 'stats'
  | 'billing'
  | 'profile'
  | 'support'
  | 'settings'
  | 'generic';

export function contextFallback(context: ErrorContext): string {
  switch (context) {
    case 'login':
      return ERRORS_COPY.login;
    case 'ocr':
      return ERRORS_COPY.ocr;
    case 'meal':
      return ERRORS_COPY.meal;
    case 'stats':
      return ERRORS_COPY.stats;
    case 'billing':
      return ERRORS_COPY.billing;
    case 'profile':
      return ERRORS_COPY.profile;
    case 'support':
      return ERRORS_COPY.support;
    case 'settings':
      return ERRORS_COPY.settings;
    default:
      return ERRORS_COPY.generic;
  }
}
