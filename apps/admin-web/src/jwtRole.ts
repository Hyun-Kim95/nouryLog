export type JwtRole = 'USER' | 'ADMIN';

/** 서버 검증 없이 UX용으로 JWT payload의 role만 읽는다. */
export function readJwtRole(token: string): JwtRole | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: unknown };
    if (json.role === 'ADMIN' || json.role === 'USER') return json.role;
    return null;
  } catch {
    return null;
  }
}

export function isAdminToken(token: string | null | undefined): boolean {
  return token != null && readJwtRole(token) === 'ADMIN';
}
