import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';
import { clearTokens, getAccessToken } from './authStorage';
import { isAuthDenied } from './lib/apiError';
import type { RootStackParamList } from './navigation';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const DEFAULT_LOGIN_NOTICE = '로그인이 필요합니다. 다시 로그인해 주세요.';

let loginNotice: string | null = null;
let pendingLoginReset = false;

function resetToLogin() {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
    pendingLoginReset = false;
  } else {
    pendingLoginReset = true;
  }
}

/** NavigationContainer onReady에서 호출 */
export function flushPendingLoginRedirect() {
  if (pendingLoginReset) resetToLogin();
}

export function consumeLoginNotice(): string | null {
  const notice = loginNotice;
  loginNotice = null;
  return notice;
}

/** 토큰이 없으면 로그인 화면으로 보내고 null을 반환한다. */
export async function ensureAccessToken(): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) {
    await signOutToLogin();
    return null;
  }
  return token;
}

export async function signOutToLogin(notice = DEFAULT_LOGIN_NOTICE): Promise<void> {
  loginNotice = notice;
  await clearTokens();
  resetToLogin();
}

/** 인증 오류면 세션 종료 후 로그인 화면으로 이동하고 true를 반환한다. */
export function handleAuthFailure(err: unknown, notice?: string): boolean {
  if (!isAuthDenied(err)) return false;
  void signOutToLogin(notice);
  return true;
}
