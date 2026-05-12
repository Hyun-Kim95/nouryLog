import { Router } from 'express';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
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

async function recordLogin(userId: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  } catch {
    // 부수효과 분리: 실패해도 토큰 발급은 계속 진행한다.
  }
}

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

const REQUIRED_CONSENT_KINDS = ['terms', 'privacy'] as const;
type ConsentKind = (typeof REQUIRED_CONSENT_KINDS)[number];
type ConsentVersions = Record<ConsentKind, number>;

function parseConsentVersions(body: unknown): { versions?: ConsentVersions; message?: string; details?: Record<string, unknown> } {
  const b = body as {
    ageConfirmed?: unknown;
    consents?: Partial<Record<ConsentKind, { version?: unknown }>>;
  };
  if (b.ageConfirmed !== true) {
    return {
      message: '만 14세 이상 확인이 필요합니다.',
      details: { field: 'ageConfirmed' },
    };
  }

  const versions: Partial<ConsentVersions> = {};
  for (const kind of REQUIRED_CONSENT_KINDS) {
    const raw = b.consents?.[kind]?.version;
    const version = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isInteger(version) || version <= 0) {
      return {
        message: '이용약관과 개인정보처리방침 동의 버전이 필요합니다.',
        details: { field: `consents.${kind}.version`, kind },
      };
    }
    versions[kind] = version;
  }
  return { versions: versions as ConsentVersions };
}

async function validatePublishedConsentVersions(
  client: Prisma.TransactionClient | typeof prisma,
  versions: ConsentVersions,
): Promise<{ ok: true } | { ok: false; message: string; details: Record<string, unknown> }> {
  const docs = await client.policyDocument.findMany({
    where: { kind: { in: [...REQUIRED_CONSENT_KINDS] }, publishedAt: { not: null } },
    select: { kind: true, version: true },
  });
  const byKind = new Map(docs.map((doc) => [doc.kind, doc.version]));
  for (const kind of REQUIRED_CONSENT_KINDS) {
    const current = byKind.get(kind);
    if (!current) {
      return {
        ok: false,
        message: '게시된 정책 문서를 찾을 수 없습니다.',
        details: { kind },
      };
    }
    if (current !== versions[kind]) {
      return {
        ok: false,
        message: '최신 정책 문서에 다시 동의해 주세요.',
        details: { kind, currentVersion: current, submittedVersion: versions[kind] },
      };
    }
  }
  return { ok: true };
}

async function createMissingConsents(
  client: Prisma.TransactionClient | typeof prisma,
  userId: string,
  versions: ConsentVersions,
  source: string | null,
) {
  for (const kind of REQUIRED_CONSENT_KINDS) {
    const existing = await client.userConsent.findFirst({
      where: { userId, kind, policyVersion: versions[kind] },
      select: { id: true },
    });
    if (existing) continue;
    await client.userConsent.create({
      data: { userId, kind, policyVersion: versions[kind], source },
    });
  }
}

async function requiresCurrentConsent(userId: string): Promise<boolean> {
  const docs = await prisma.policyDocument.findMany({
    where: { kind: { in: [...REQUIRED_CONSENT_KINDS] }, publishedAt: { not: null } },
    select: { kind: true, version: true },
  });
  if (docs.length < REQUIRED_CONSENT_KINDS.length) return true;
  const rows = await prisma.userConsent.findMany({
    where: { userId, kind: { in: [...REQUIRED_CONSENT_KINDS] } },
    select: { kind: true, policyVersion: true },
  });
  return docs.some((doc) => !rows.some((row) => row.kind === doc.kind && row.policyVersion === doc.version));
}

publicRouter.post('/auth/signup', async (req, res) => {
  const email = String((req.body as { email?: string })?.email ?? '').trim().toLowerCase();
  const password = String((req.body as { password?: string })?.password ?? '');
  if (!email || !password || password.length < 6) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, '이메일과 비밀번호(6자 이상)가 필요합니다.');
    return;
  }
  const consent = parseConsentVersions(req.body);
  if (!consent.versions) {
    sendError(res, 422, ErrorCodes.VALIDATION_FAILED, consent.message ?? '동의 정보가 필요합니다.', consent.details);
    return;
  }
  try {
    const passwordHash = await hashPassword(password);
    await prisma.$transaction(async (tx) => {
      const validation = await validatePublishedConsentVersions(tx, consent.versions!);
      if (!validation.ok) {
        throw Object.assign(new Error(validation.message), {
          consentValidation: true,
          details: validation.details,
        });
      }
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          profile: { create: { gender: 'unspecified', age: 30, heightCm: 170, weightKg: 70 } },
          billing: { create: {} },
        },
        select: { id: true },
      });
      await createMissingConsents(tx, user.id, consent.versions!, 'email-signup');
    });
    res.status(201).json({ ok: true });
  } catch (e) {
    if (e instanceof Error && 'consentValidation' in e) {
      const detail = e as Error & { details?: Record<string, unknown> };
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, detail.message, detail.details);
      return;
    }
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
  await recordLogin(user.id);
  res.json({
    accessToken: signAccess(user.id, role),
    refreshToken: signRefresh(user.id, role),
  });
});

publicRouter.post('/auth/refresh', async (req, res) => {
  const raw = String((req.body as { refreshToken?: string })?.refreshToken ?? '');
  try {
    const p = verifyToken(raw);
    if (p.typ !== 'refresh') {
      sendError(res, 401, ErrorCodes.AUTH_TOKEN_EXPIRED, '리프레시 토큰이 필요합니다.');
      return;
    }
    await recordLogin(p.sub);
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
  const state = String(req.query.state ?? '').trim();
  const code = String(req.query.code ?? '').trim();
  /// OAuth2 오류 응답은 보통 `code` 없이 `error`만 온다. 일부 클라이언트/프록시가 `error` 키를 붙이는 경우가 있어 `code`가 있으면 성공 플로로 진행한다.
  const oauthError = String(req.query.error ?? '').trim();
  if (!provider || !state) {
    sendError(res, 400, ErrorCodes.SOCIAL_STATE_INVALID, '유효하지 않은 소셜 상태 값입니다.');
    return;
  }

  const stateItem = consumeOAuthState(provider, state);
  if (!stateItem) {
    sendError(res, 400, ErrorCodes.SOCIAL_STATE_INVALID, '소셜 로그인 상태가 만료되었거나 유효하지 않습니다.');
    return;
  }

  if (oauthError && !code) {
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

  try {
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
      await recordLogin(linked.user.id);
      const redirect = new URL(stateItem.redirectUri);
      redirect.searchParams.set('result', 'success');
      redirect.searchParams.set('accessToken', signAccess(linked.user.id, role));
      redirect.searchParams.set('refreshToken', signRefresh(linked.user.id, role));
      redirect.searchParams.set('requiresConsent', String(await requiresCurrentConsent(linked.user.id)));
      res.redirect(redirect.toString());
      return;
    }

    const normalizedEmail = profile.email ? profile.email.trim().toLowerCase() : null;
    /// 가입에 쓸 이메일(실이메일 또는 @social.local). 이미 존재하면 링크 충돌 플로로 보낸다(P2002 방지).
    const newEmail = (normalizedEmail ?? makeFallbackEmail(provider, profile.providerUserId)).trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existingUser) {
      const conflictToken = createConflictToken({
        provider,
        providerUserId: profile.providerUserId,
        email: normalizedEmail ?? newEmail,
        name: profile.name,
      });
      const redirect = new URL(stateItem.redirectUri);
      redirect.searchParams.set('result', 'conflict');
      redirect.searchParams.set('conflictToken', conflictToken);
      redirect.searchParams.set('email', newEmail);
      res.redirect(redirect.toString());
      return;
    }

    const created = await prisma.user.create({
      data: {
        email: newEmail,
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
    await recordLogin(created.id);
    const redirect = new URL(stateItem.redirectUri);
    redirect.searchParams.set('result', 'success');
    redirect.searchParams.set('accessToken', tokenPair.accessToken);
    redirect.searchParams.set('refreshToken', tokenPair.refreshToken);
    redirect.searchParams.set('requiresConsent', 'true');
    res.redirect(redirect.toString());
  } catch (e) {
    console.error('[auth/social/callback] unhandled', { provider, err: e });
    const msg =
      e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
        ? '이미 사용 중인 계정 정보입니다. 기존 계정 연결을 선택해 주세요.'
        : '계정을 만들 수 없습니다. 잠시 후 다시 시도해 주세요.';
    try {
      const redirect = new URL(stateItem.redirectUri);
      redirect.searchParams.set('result', 'error');
      redirect.searchParams.set('code', ErrorCodes.OAUTH_PROVIDER_ERROR);
      redirect.searchParams.set('message', msg);
      res.redirect(redirect.toString());
    } catch {
      sendError(res, 500, ErrorCodes.OAUTH_PROVIDER_ERROR, '소셜 콜백 처리 중 오류가 발생했습니다.');
    }
  }
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
    res.json({ ...tokenPair, requiresConsent: await requiresCurrentConsent(user.id) });
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
  res.json({ ...tokenPair, requiresConsent: true });
});

const PUBLIC_POLICY_KINDS = ['terms', 'privacy'] as const;
type PublicPolicyKind = (typeof PUBLIC_POLICY_KINDS)[number];
function isPublicPolicyKind(v: unknown): v is PublicPolicyKind {
  return typeof v === 'string' && (PUBLIC_POLICY_KINDS as readonly string[]).includes(v);
}

publicRouter.get('/public/policies/:kind', async (req, res) => {
  const kind = req.params.kind;
  if (!isPublicPolicyKind(kind)) {
    sendError(
      res,
      422,
      ErrorCodes.VALIDATION_FAILED,
      `kind는 ${PUBLIC_POLICY_KINDS.join(' | ')} 중 하나여야 합니다.`,
      { allowed: [...PUBLIC_POLICY_KINDS] },
    );
    return;
  }
  const doc = await prisma.policyDocument.findUnique({ where: { kind } });
  if (!doc || !doc.publishedAt) {
    sendError(res, 404, ErrorCodes.VALIDATION_FAILED, '게시된 문서를 찾을 수 없습니다.');
    return;
  }
  res.json({
    kind: doc.kind,
    body: doc.body,
    version: doc.version,
    publishedAt: doc.publishedAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  });
});
