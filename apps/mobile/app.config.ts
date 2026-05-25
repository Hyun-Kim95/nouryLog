import type { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * 정적 app.json 을 그대로 사용하던 구조에서, 네이티브 SNS SDK 의 플러그인 인자에
 * .env 의 값을 주입하기 위해 동적 app.config.ts 로 전환.
 *
 * 우선순위:
 *   - apps/mobile/.env 의 EXPO_PUBLIC_* 값
 *   - 없으면 빌드 실패 대신 placeholder 유지(개발 편의). 실제 빌드 전엔 반드시 채워야 한다.
 */
/** Google 공식 샘플 App ID — AdMob 콘솔 값 채우기 전 로컬 prebuild/개발용 */
const ADMOB_SAMPLE_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const ADMOB_SAMPLE_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

const APP_DISPLAY_NAME = 'nouryLog';

const isPlayBillingEnabled = process.env.EXPO_PUBLIC_PLAY_BILLING_ENABLED === 'true';

function assertProductionBuildConfig(): void {
  const profile = process.env.EAS_BUILD_PROFILE;
  const isProduction = profile === 'production' || process.env.NODE_ENV === 'production';
  if (!isProduction) return;

  const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();
  if (!apiUrl || !/^https:\/\//i.test(apiUrl)) {
    throw new Error(
      'production 빌드: EXPO_PUBLIC_API_URL 은 https 프로덕션 API URL 이어야 합니다. EAS Secret 을 확인하세요.',
    );
  }
  if (/localhost|127\.0\.0\.1/i.test(apiUrl)) {
    throw new Error('production 빌드: EXPO_PUBLIC_API_URL 에 localhost 를 사용할 수 없습니다.');
  }

  const admobAndroid = process.env.ADMOB_ANDROID_APP_ID ?? ADMOB_SAMPLE_ANDROID_APP_ID;
  if (admobAndroid === ADMOB_SAMPLE_ANDROID_APP_ID) {
    throw new Error(
      'production 빌드: ADMOB_ANDROID_APP_ID 가 Google 샘플 ID 입니다. AdMob 콘솔 앱 ID 를 EAS Secret 에 등록하세요.',
    );
  }

  const kakaoKey = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY ?? '';
  if (!kakaoKey || kakaoKey.startsWith('PLACEHOLDER_')) {
    throw new Error(
      'production 빌드: EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY 가 비어 있거나 placeholder 입니다.',
    );
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  assertProductionBuildConfig();
  const naverIosUrlScheme = process.env.EXPO_PUBLIC_NAVER_IOS_URL_SCHEME ?? 'naverlogin-nourylog';
  const kakaoAppKey = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY ?? '';
  const admobAndroidAppId = process.env.ADMOB_ANDROID_APP_ID ?? ADMOB_SAMPLE_ANDROID_APP_ID;
  const admobIosAppId = process.env.ADMOB_IOS_APP_ID ?? ADMOB_SAMPLE_IOS_APP_ID;

  const plugins: ExpoConfig['plugins'] = [
    'expo-secure-store',
    [
      'expo-image-picker',
      {
        photosPermission: '영양성분표 사진을 분석하려면 사진 라이브러리 접근이 필요합니다.',
        cameraPermission: '영양성분표를 촬영해 분석하려면 카메라 접근이 필요합니다.',
      },
    ],
    ['expo-notifications', { color: '#16a34a' }],
    [
      '@react-native-seoul/naver-login',
      {
        urlScheme: naverIosUrlScheme,
      },
    ],
    './plugins/withKakaoMavenRepository',
    [
      '@react-native-seoul/kakao-login',
      {
        /// 카카오는 빈 문자열이면 prebuild 단계에서 오류가 난다. placeholder 라도 채워 둬야 한다.
        kakaoAppKey: kakaoAppKey || 'PLACEHOLDER_KAKAO_NATIVE_APP_KEY',
        /// 카카오 플러그인 디폴트(1.5.10) 는 Expo SDK 54 KSP 요구(2.0+) 와 호환되지 않아 명시 지정.
        kotlinVersion: '2.0.21',
      },
    ],
    ['@react-native-google-signin/google-signin'],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: admobAndroidAppId,
        iosAppId: admobIosAppId,
      },
    ],
  ];

  if (isPlayBillingEnabled) {
    plugins.push('react-native-iap');
  }

  return {
    ...(config as ExpoConfig),
    name: APP_DISPLAY_NAME,
    slug: 'mobile',
    scheme: 'dietmobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: { supportsTablet: true },
    android: {
      package: 'com.nourylog.app',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: { favicon: './assets/favicon.png' },
    plugins,
    extra: {
      eas: {
        projectId: 'de428fed-aa92-4073-a8a7-ef201a4b4ddc',
      },
    },
  };
};
