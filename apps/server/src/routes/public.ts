import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { signAccess, signRefresh, verifyToken } from '../lib/jwt.js';
import { sendError, ErrorCodes } from '../lib/errors.js';

export const publicRouter = Router();

publicRouter.post('/auth/signup', async (req, res) => {
  const email = String((req.body as { email?: string })?.email ?? '').trim().toLowerCase();
  const password = String((req.body as { password?: string })?.password ?? '');
  if (!email || !password || password.length < 6) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, '이메일과 비밀번호(6자 이상)가 필요합니다.');
    return;
  }
  try {
    const passwordHash = await hashPassword(password);
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        profile: { create: { gender: 'unspecified', age: 30, heightCm: 170, weightKg: 70 } },
        billing: { create: {} },
      },
    });
    res.status(201).json({ ok: true });
  } catch {
    sendError(res, 422, ErrorCodes.RESOURCE_CONFLICT, '이미 사용 중인 이메일입니다.');
  }
});

publicRouter.post('/auth/login', async (req, res) => {
  const email = String((req.body as { email?: string })?.email ?? '').trim().toLowerCase();
  const password = String((req.body as { password?: string })?.password ?? '');
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    sendError(res, 401, ErrorCodes.AUTH_UNAUTHORIZED, '이메일 또는 비밀번호가 올바르지 않습니다.');
    return;
  }
  if (!user.active) {
    sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '비활성화된 계정입니다.');
    return;
  }
  const role = user.role === 'ADMIN' ? 'ADMIN' : 'USER';
  res.json({
    accessToken: signAccess(user.id, role),
    refreshToken: signRefresh(user.id, role),
  });
});

publicRouter.post('/auth/refresh', (req, res) => {
  const raw = String((req.body as { refreshToken?: string })?.refreshToken ?? '');
  try {
    const p = verifyToken(raw);
    if (p.typ !== 'refresh') {
      sendError(res, 401, ErrorCodes.AUTH_TOKEN_EXPIRED, '리프레시 토큰이 필요합니다.');
      return;
    }
    res.json({
      accessToken: signAccess(p.sub, p.role),
      refreshToken: signRefresh(p.sub, p.role),
    });
  } catch {
    sendError(res, 401, ErrorCodes.AUTH_TOKEN_EXPIRED, '리프레시 토큰이 유효하지 않습니다.');
  }
});
