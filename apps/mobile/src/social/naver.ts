import NaverLogin from '@react-native-seoul/naver-login';
import type { SocialAdapter, SocialLoginResult } from './types';

const NAVER_APP_NAME = process.env.EXPO_PUBLIC_NAVER_APP_NAME ?? 'nouryLog';
const NAVER_CONSUMER_KEY = process.env.EXPO_PUBLIC_NAVER_CLIENT_ID ?? '';
const NAVER_CONSUMER_SECRET = process.env.EXPO_PUBLIC_NAVER_CLIENT_SECRET ?? '';
const NAVER_IOS_URL_SCHEME = process.env.EXPO_PUBLIC_NAVER_IOS_URL_SCHEME ?? '';

let initialized = false;
function ensureInitialized(): boolean {
  if (initialized) return true;
  if (!NAVER_CONSUMER_KEY || !NAVER_CONSUMER_SECRET) {
    console.warn('[social-naver]', 'missing_env', {
      hasClientId: Boolean(NAVER_CONSUMER_KEY),
      hasClientSecret: Boolean(NAVER_CONSUMER_SECRET),
    });
    return false;
  }
  try {
    NaverLogin.initialize({
      appName: NAVER_APP_NAME,
      consumerKey: NAVER_CONSUMER_KEY,
      consumerSecret: NAVER_CONSUMER_SECRET,
      serviceUrlSchemeIOS: NAVER_IOS_URL_SCHEME,
      disableNaverAppAuthIOS: false,
    });
    initialized = true;
    return true;
  } catch (e) {
    console.warn('[social-naver]', 'init_failed', { err: e });
    return false;
  }
}

async function login(): Promise<SocialLoginResult> {
  if (!ensureInitialized()) {
    return { kind: 'error', message: '네이버 로그인 설정이 누락되었습니다.' };
  }
  try {
    const result = await NaverLogin.login();
    if (result.isSuccess && result.successResponse?.accessToken) {
      return {
        kind: 'success',
        providerAccessToken: result.successResponse.accessToken,
      };
    }
    /// failureResponse.isCancel 이 true 면 사용자 취소로 분리.
    if (result.failureResponse?.isCancel) {
      return { kind: 'cancelled' };
    }
    return {
      kind: 'error',
      message: result.failureResponse?.message ?? '네이버 로그인에 실패했습니다.',
    };
  } catch (e) {
    return { kind: 'error', message: e instanceof Error ? e.message : '네이버 로그인에 실패했습니다.' };
  }
}

async function logout(): Promise<void> {
  if (!initialized) return;
  try {
    await NaverLogin.logout();
  } catch (e) {
    console.warn('[social-naver]', 'logout_failed', { err: e });
  }
}

export const naverAdapter: SocialAdapter = { provider: 'naver', login, logout };
