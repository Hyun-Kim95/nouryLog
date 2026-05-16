import { login as kakaoLogin, logout as kakaoLogout } from '@react-native-seoul/kakao-login';
import type { SocialAdapter, SocialLoginResult } from './types';

async function login(): Promise<SocialLoginResult> {
  try {
    const result = await kakaoLogin();
    if (result?.accessToken) {
      return {
        kind: 'success',
        providerAccessToken: result.accessToken,
        idToken: result.idToken ?? undefined,
      };
    }
    return { kind: 'error', message: '카카오 로그인 응답이 비어 있습니다.' };
  } catch (e) {
    const message = e instanceof Error ? e.message : '카카오 로그인 실패';
    /// 사용자 취소(Android: code=KakaoUserCancelled / message 에 cancel 포함, iOS: code=E_KAKAO_CANCELLED)는 분리.
    const lower = message.toLowerCase();
    if (lower.includes('cancel')) return { kind: 'cancelled' };
    return { kind: 'error', message };
  }
}

async function logout(): Promise<void> {
  try {
    await kakaoLogout();
  } catch (e) {
    console.warn('[social-kakao]', 'logout_failed', { err: e });
  }
}

export const kakaoAdapter: SocialAdapter = { provider: 'kakao', login, logout };
