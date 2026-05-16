/**
 * 네이티브 SDK 전환 이후, 서버 측 OAuth(authorize/token 교환)는 더 이상 수행하지 않는다.
 * 충돌 토큰 JWT 서명에 쓰는 시크릿만 남겨 둔다.
 */
export const OAUTH_STATE_SECRET = String(
  process.env.OAUTH_STATE_SECRET ?? process.env.JWT_SECRET ?? 'dev-social-secret-change-me',
);
