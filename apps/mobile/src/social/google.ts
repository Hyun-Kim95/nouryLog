import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import type { SocialAdapter, SocialLoginResult } from './types';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!WEB_CLIENT_ID) {
    console.warn('[social-google]', 'missing_env', { hasWebClientId: false });
    return false;
  }
  try {
    GoogleSignin.configure({
      /// Web 클라이언트 ID 를 써야 서버가 idToken 의 aud 를 동일하게 검증할 수 있다.
      webClientId: WEB_CLIENT_ID,
      offlineAccess: false,
    });
    configured = true;
    return true;
  } catch (e) {
    console.warn('[social-google]', 'configure_failed', { err: e });
    return false;
  }
}

async function login(): Promise<SocialLoginResult> {
  if (!ensureConfigured()) {
    return { kind: 'error', message: '구글 로그인 설정이 누락되었습니다.' };
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const signed = await GoogleSignin.signIn();
    if (signed.type === 'cancelled') return { kind: 'cancelled' };
    const idToken = signed.data.idToken;
    if (!idToken) {
      return { kind: 'error', message: '구글 idToken 을 가져오지 못했습니다.' };
    }
    return { kind: 'success', idToken };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === statusCodes.SIGN_IN_CANCELLED) return { kind: 'cancelled' };
    if (err.code === statusCodes.IN_PROGRESS) {
      return { kind: 'error', message: '이미 구글 로그인이 진행 중입니다.' };
    }
    if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { kind: 'error', message: 'Google Play 서비스가 필요합니다.' };
    }
    return { kind: 'error', message: err.message ?? '구글 로그인에 실패했습니다.' };
  }
}

async function logout(): Promise<void> {
  if (!configured) return;
  try {
    await GoogleSignin.signOut();
  } catch (e) {
    console.warn('[social-google]', 'logout_failed', { err: e });
  }
}

export const googleAdapter: SocialAdapter = { provider: 'google', login, logout };
