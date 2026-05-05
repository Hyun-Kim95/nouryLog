import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET ?? 'dev-only-change-me-please-min-32-characters';

export type JwtPayload = { sub: string; role: 'USER' | 'ADMIN'; typ: 'access' | 'refresh' };

export function signAccess(userId: string, role: 'USER' | 'ADMIN') {
  return jwt.sign({ sub: userId, role, typ: 'access' } satisfies JwtPayload, SECRET, { expiresIn: '8h' });
}

export function signRefresh(userId: string, role: 'USER' | 'ADMIN') {
  return jwt.sign({ sub: userId, role, typ: 'refresh' } satisfies JwtPayload, SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}
