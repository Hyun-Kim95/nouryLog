import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt.js';
import { sendError, ErrorCodes } from '../lib/errors.js';

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; role: 'USER' | 'ADMIN' };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.header('authorization');
  if (!h?.startsWith('Bearer ')) {
    sendError(res, 401, ErrorCodes.AUTH_UNAUTHORIZED, '인증이 필요합니다.');
    return;
  }
  const token = h.slice('Bearer '.length).trim();
  try {
    const p = verifyToken(token);
    if (p.typ !== 'access') {
      sendError(res, 401, ErrorCodes.AUTH_TOKEN_EXPIRED, '액세스 토큰이 필요합니다.');
      return;
    }
    req.auth = { userId: p.sub, role: p.role };
    next();
  } catch {
    sendError(res, 401, ErrorCodes.AUTH_TOKEN_EXPIRED, '토큰이 만료되었거나 유효하지 않습니다.');
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.auth?.role !== 'ADMIN') {
      sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '관리자 권한이 필요합니다.');
      return;
    }
    next();
  });
}
