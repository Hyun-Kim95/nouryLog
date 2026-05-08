import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { signAccess, signRefresh, verifyToken } from '../lib/jwt.js';
import { sendError, ErrorCodes } from '../lib/errors.js';
import {
  createAuthorizationUrl,
  createConflictToken,
  consumeOAuthState,
  fetchProviderProfile,
  parseSocialProvider,
  verifyConflictToken,
} from '../lib/socialAuth.js';

export const publicRouter = Router();

async function issueTokensForUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  if (!user.active) return { error: 'inactive' as const };
  const role = user.role === 'ADMIN' ? 'ADMIN' : 'USER';
  return {
    accessToken: signAccess(user.id, role),
    refreshToken: signRefresh(user.id, role),
  };
}

function makeFallbackEmail(provider: 'NAVER' | 'GOOGLE' | 'KAKAO', providerUserId: string) {
  return `${provider.toLowerCase()}_${providerUserId}@social.local`;
}

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

publicRouter.post('/auth/social/:provider/start', (req, res) => {
  const provider = parseSocialProvider(String(req.params.provider ?? ''));
  const redirectUri = String((req.body as { redirectUri?: string })?.redirectUri ?? '');
  if (!provider || !redirectUri) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'provider와 redirectUri가 필요합니다.');
    return;
  }
  const authorizationUrl = createAuthorizationUrl(provider, redirectUri);
  if (!authorizationUrl) {
    sendError(res, 503, ErrorCodes.DEPENDENCY_UNAVAILABLE, '소셜 로그인 설정이 누락되었습니다.');
    return;
  }
  res.json({ authorizationUrl });
});

publicRouter.get('/auth/social/:provider/callback', async (req, res) => {
  const provider = parseSocialProvider(String(req.params.provider ?? ''));
  const state = String(req.query.state ?? '');
  const code = String(req.query.code ?? '');
  const oauthError = String(req.query.error ?? '');
  if (!provider || !state) {
    sendError(res, 400, ErrorCodes.SOCIAL_STATE_INVALID, '유효하지 않은 소셜 상태 값입니다.');
    return;
  }

  const stateItem = consumeOAuthState(provider, state);
  if (!stateItem) {
    sendError(res, 400, ErrorCodes.SOCIAL_STATE_INVALID, '소셜 로그인 상태가 만료되었거나 유효하지 않습니다.');
    return;
  }

  if (oauthError) {
    const redirect = new URL(stateItem.redirectUri);
    redirect.searchParams.set('result', 'error');
    redirect.searchParams.set('code', ErrorCodes.OAUTH_CANCELLED);
    redirect.searchParams.set('message', 'SNS 로그인이 취소되었습니다.');
    res.redirect(redirect.toString());
    return;
  }

  if (!code) {
    const redirect = new URL(stateItem.redirectUri);
    redirect.searchParams.set('result', 'error');
    redirect.searchParams.set('code', ErrorCodes.OAUTH_PROVIDER_ERROR);
    redirect.searchParams.set('message', '인증 코드가 없습니다.');
    res.redirect(redirect.toString());
    return;
  }

  const profile = await fetchProviderProfile(provider, code, state);
  if (!profile) {
    const redirect = new URL(stateItem.redirectUri);
    redirect.searchParams.set('result', 'error');
    redirect.searchParams.set('code', ErrorCodes.OAUTH_PROVIDER_ERROR);
    redirect.searchParams.set('message', 'SNS 사용자 정보를 확인할 수 없습니다.');
    res.redirect(redirect.toString());
    return;
  }

  const linked = await prisma.socialAccount.findUnique({
    where: { provider_providerUserId: { provider, providerUserId: profile.providerUserId } },
    include: { user: true },
  });
  if (linked) {
    if (!linked.user.active) {
      const redirect = new URL(stateItem.redirectUri);
      redirect.searchParams.set('result', 'error');
      redirect.searchParams.set('code', ErrorCodes.AUTH_FORBIDDEN);
      redirect.searchParams.set('message', '비활성화된 계정입니다.');
      res.redirect(redirect.toString());
      return;
    }
    const role = linked.user.role === 'ADMIN' ? 'ADMIN' : 'USER';
    const redirect = new URL(stateItem.redirectUri);
    redirect.searchParams.set('result', 'success');
    redirect.searchParams.set('accessToken', signAccess(linked.user.id, role));
    redirect.searchParams.set('refreshToken', signRefresh(linked.user.id, role));
    res.redirect(redirect.toString());
    return;
  }

  const normalizedEmail = profile.email ? profile.email.trim().toLowerCase() : null;
  const existingByEmail = normalizedEmail
    ? await prisma.user.findUnique({ where: { email: normalizedEmail } })
    : null;

  if (existingByEmail) {
    const conflictToken = createConflictToken({
      provider,
      providerUserId: profile.providerUserId,
      email: normalizedEmail,
      name: profile.name,
    });
    const redirect = new URL(stateItem.redirectUri);
    redirect.searchParams.set('result', 'conflict');
    redirect.searchParams.set('conflictToken', conflictToken);
    if (normalizedEmail) redirect.searchParams.set('email', normalizedEmail);
    res.redirect(redirect.toString());
    return;
  }

  const created = await prisma.user.create({
    data: {
      email: normalizedEmail ?? makeFallbackEmail(provider, profile.providerUserId),
      passwordHash: await hashPassword(crypto.randomUUID()),
      profile: { create: { gender: 'unspecified', age: 30, heightCm: 170, weightKg: 70 } },
      billing: { create: {} },
      socialAccounts: {
        create: {
          provider,
          providerUserId: profile.providerUserId,
          email: normalizedEmail,
        },
      },
    },
  });
  const tokenPair = await issueTokensForUser(created.id);
  if (!tokenPair || 'error' in tokenPair) {
    const redirect = new URL(stateItem.redirectUri);
    redirect.searchParams.set('result', 'error');
    redirect.searchParams.set('code', ErrorCodes.AUTH_FORBIDDEN);
    redirect.searchParams.set('message', '계정을 사용할 수 없습니다.');
    res.redirect(redirect.toString());
    return;
  }
  const redirect = new URL(stateItem.redirectUri);
  redirect.searchParams.set('result', 'success');
  redirect.searchParams.set('accessToken', tokenPair.accessToken);
  redirect.searchParams.set('refreshToken', tokenPair.refreshToken);
  res.redirect(redirect.toString());
});

publicRouter.post('/auth/social/conflict/resolve', async (req, res) => {
  const conflictToken = String((req.body as { conflictToken?: string })?.conflictToken ?? '');
  const action = String((req.body as { action?: string })?.action ?? '');
  if (!conflictToken || (action !== 'link' && action !== 'separate')) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'conflictToken과 action(link|separate)이 필요합니다.');
    return;
  }
  const payload = verifyConflictToken(conflictToken);
  if (!payload) {
    sendError(res, 401, ErrorCodes.AUTH_UNAUTHORIZED, '충돌 확인 토큰이 유효하지 않습니다.');
    return;
  }

  const email = payload.email?.trim().toLowerCase() ?? null;
  if (action === 'link') {
    if (!email) {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, '연결 대상 이메일이 없습니다.');
      return;
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      sendError(res, 404, ErrorCodes.RESOURCE_CONFLICT, '연결할 기존 계정을 찾을 수 없습니다.');
      return;
    }
    await prisma.socialAccount.upsert({
      where: {
        provider_providerUserId: {
          provider: payload.provider,
          providerUserId: payload.providerUserId,
        },
      },
      update: {
        userId: user.id,
        email,
      },
      create: {
        provider: payload.provider,
        providerUserId: payload.providerUserId,
        email,
        userId: user.id,
      },
    });
    const tokenPair = await issueTokensForUser(user.id);
    if (!tokenPair || 'error' in tokenPair) {
      sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '비활성화된 계정입니다.');
      return;
    }
    res.json(tokenPair);
    return;
  }

  const newUser = await prisma.user.create({
    data: {
      email: makeFallbackEmail(payload.provider, payload.providerUserId),
      passwordHash: await hashPassword(crypto.randomUUID()),
      profile: { create: { gender: 'unspecified', age: 30, heightCm: 170, weightKg: 70 } },
      billing: { create: {} },
      socialAccounts: {
        create: {
          provider: payload.provider,
          providerUserId: payload.providerUserId,
          email,
        },
      },
    },
  });
  const tokenPair = await issueTokensForUser(newUser.id);
  if (!tokenPair || 'error' in tokenPair) {
    sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '계정을 사용할 수 없습니다.');
    return;
  }
  res.json(tokenPair);
});
