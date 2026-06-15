export const DEMO_COPY = {
  brand: 'nouryLog',
  heroTitle: '식단 인사이트 데모',
  heroTagline: '기록 기반 주간·월간 요약과 패턴',
  ctaDemo: '데모 계정으로 바로 체험',
  ctaDemoLoading: '데모 로그인 중…',
  ctaNoCredentials: '데모 계정 env가 없습니다 (VITE_DEMO_EMAIL / VITE_DEMO_PASSWORD)',
  ctaKakao: '카카오 로그인',
  ctaGoogle: 'Google 로그인',
  ctaNaver: '네이버 로그인',
  googleEnvHint: 'Google: VITE_GOOGLE_CLIENT_ID 설정 시 버튼이 표시됩니다.',
  kakaoEnvHint: 'Kakao: VITE_KAKAO_JAVASCRIPT_KEY를 설정하세요.',
  naverEnvHint: 'Naver: VITE_NAVER_CLIENT_ID, VITE_NAVER_REDIRECT_URI를 설정하세요.',
  demoModeBanner: '시드 데이터 시연 중입니다. 본인 기록을 보려면 로그아웃 후 SNS로 로그인하세요.',
  emptyWeekTitle: '이번 주 식단 기록이 없어요',
  emptyWeekHint: '데모 DB에 시드 데이터가 있는지 확인해 주세요.',
  envSetupHint:
    'apps/user-web/.env.local에 VITE_DEMO_EMAIL, VITE_DEMO_PASSWORD (또는 VITE_DEV_*)를 설정하세요.',
} as const;
