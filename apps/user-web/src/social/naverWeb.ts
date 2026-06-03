export function naverWebConfigured(): boolean {
  const id = import.meta.env.VITE_NAVER_CLIENT_ID?.trim();
  const uri = import.meta.env.VITE_NAVER_REDIRECT_URI?.trim();
  return Boolean(id && uri);
}

export function getNaverRedirectUri(): string {
  return import.meta.env.VITE_NAVER_REDIRECT_URI?.trim() ?? '';
}

export function buildNaverAuthorizeUrl(state: string): string {
  const clientId = import.meta.env.VITE_NAVER_CLIENT_ID?.trim();
  const redirectUri = getNaverRedirectUri();
  if (!clientId || !redirectUri) {
    throw new Error('네이버 로그인 env가 설정되지 않았습니다.');
  }
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });
  return `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`;
}

export function saveNaverOAuthState(state: string, next: string): void {
  sessionStorage.setItem('nourylog:naverOAuthState', state);
  sessionStorage.setItem('nourylog:naverOAuthNext', next);
}

export function consumeNaverOAuthState(received: string): { ok: boolean; next: string } {
  const expected = sessionStorage.getItem('nourylog:naverOAuthState');
  const next = sessionStorage.getItem('nourylog:naverOAuthNext') ?? '/ai/coach';
  sessionStorage.removeItem('nourylog:naverOAuthState');
  sessionStorage.removeItem('nourylog:naverOAuthNext');
  return { ok: Boolean(expected && expected === received), next };
}
