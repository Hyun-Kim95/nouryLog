import { http, HttpResponse } from 'msw';

function traceId() {
  return crypto.randomUUID();
}

function err(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
  return HttpResponse.json({ code, message, details, traceId: traceId() }, { status });
}

function paginated(page: number, size: number, prefix: string) {
  const items = Array.from({ length: size }, (_, i) => ({
    id: `${prefix}_${(page - 1) * size + i + 1}`,
    status: 'active',
  }));
  return { page, size, total: 120, items };
}

function bearerOk(request: Request) {
  const h = request.headers.get('authorization');
  return !!h?.startsWith('Bearer ');
}

function adminOk(request: Request) {
  const h = request.headers.get('authorization');
  const t = h?.startsWith('Bearer ') ? h.slice('Bearer '.length).trim() : '';
  return t.startsWith('admin.');
}

export const handlers = [
  http.post('/auth/signup', () => HttpResponse.json({ ok: true }, { status: 201 })),
  http.post('/auth/login', () =>
    HttpResponse.json({ accessToken: 'stub.user.token', refreshToken: 'stub.refresh' }),
  ),
  http.post('/auth/refresh', () =>
    HttpResponse.json({ accessToken: 'stub.user.token', refreshToken: 'stub.refresh' }),
  ),

  http.get('/me/profile', ({ request }) => {
    if (!bearerOk(request)) return err(401, 'AUTH_UNAUTHORIZED', '인증이 필요합니다.');
    return HttpResponse.json({ gender: 'unspecified', age: 30, heightCm: 170, weightKg: 70 });
  }),
  http.put('/me/profile', ({ request }) => {
    if (!bearerOk(request)) return err(401, 'AUTH_UNAUTHORIZED', '인증이 필요합니다.');
    return HttpResponse.json({ ok: true });
  }),
  http.post('/me/recommendation/recalculate', ({ request }) => {
    if (!bearerOk(request)) return err(401, 'AUTH_UNAUTHORIZED', '인증이 필요합니다.');
    return HttpResponse.json({ proteinGoalG: 110, calorieGoalKcal: 2000 });
  }),

  http.post('/meals', ({ request }) => {
    if (!bearerOk(request)) return err(401, 'AUTH_UNAUTHORIZED', '인증이 필요합니다.');
    return HttpResponse.json({ mealId: 'meal_stub_1' }, { status: 201 });
  }),
  http.get('/meals', ({ request }) => {
    if (!bearerOk(request)) return err(401, 'AUTH_UNAUTHORIZED', '인증이 필요합니다.');
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const size = Number(url.searchParams.get('size') ?? 15);
    return HttpResponse.json({
      page,
      size,
      total: 1,
      items: [{ mealId: 'meal_stub_1', note: 'stub' }],
    });
  }),
  http.put('/meals/:mealId', ({ request }) => {
    if (!bearerOk(request)) return err(401, 'AUTH_UNAUTHORIZED', '인증이 필요합니다.');
    return HttpResponse.json({ ok: true });
  }),
  http.patch('/meals/:mealId/deactivate', ({ request }) => {
    if (!bearerOk(request)) return err(401, 'AUTH_UNAUTHORIZED', '인증이 필요합니다.');
    return HttpResponse.json({ ok: true });
  }),

  http.post('/nutrition/ocr', ({ request }) => {
    if (!bearerOk(request)) return err(401, 'AUTH_UNAUTHORIZED', '인증이 필요합니다.');
    return HttpResponse.json({
      calories: 120,
      carbohydrate: 20,
      protein: 6,
      fat: 2,
      confidence: 0.92,
      missingFields: [] as string[],
      remainingFreeQuota: 3,
    });
  }),

  http.get('/stats', ({ request }) => {
    if (!bearerOk(request)) return err(401, 'AUTH_UNAUTHORIZED', '인증이 필요합니다.');
    const url = new URL(request.url);
    const range = url.searchParams.get('range');
    if (!range || !['meal', 'day', 'week', 'month'].includes(range)) {
      return err(422, 'VALIDATION_FAILED', 'range 파라미터가 필요합니다.', { field: 'range' });
    }
    return HttpResponse.json({
      aggregatedAt: new Date().toISOString(),
      isStale: false,
      staleHours: 0,
      timezone: 'Asia/Seoul',
      summary: { calories: 1800, carbohydrate: 220, protein: 90, fat: 55 },
    });
  }),

  http.get('/me/billing/entitlements', ({ request }) => {
    if (!bearerOk(request)) return err(401, 'AUTH_UNAUTHORIZED', '인증이 필요합니다.');
    return HttpResponse.json({
      ocrQuotaLimit: 5,
      ocrQuotaUsed: 3,
      ocrPaidEnabled: false,
      adFreeEnabled: false,
      nextPaywallTrigger: 'none',
    });
  }),
  http.post('/me/billing/checkout', async ({ request }) => {
    if (!bearerOk(request)) return err(401, 'AUTH_UNAUTHORIZED', '인증이 필요합니다.');
    const body = (await request.json().catch(() => ({}))) as { productType?: string };
    if (body.productType !== 'premium_monthly') {
      return err(422, 'VALIDATION_FAILED', 'productType은 premium_monthly 여야 합니다.');
    }
    return HttpResponse.json({ ok: true });
  }),
  http.post('/me/billing/restore', ({ request }) => {
    if (!bearerOk(request)) return err(401, 'AUTH_UNAUTHORIZED', '인증이 필요합니다.');
    return HttpResponse.json({ ok: true });
  }),
  http.get('/me/ads/status', ({ request }) => {
    if (!bearerOk(request)) return err(401, 'AUTH_UNAUTHORIZED', '인증이 필요합니다.');
    return HttpResponse.json({ showBottomBanner: true, reason: 'default_free' });
  }),

  http.get('/admin/dashboard', ({ request }) => {
    if (!adminOk(request)) return err(403, 'AUTH_FORBIDDEN', '관리자 권한이 필요합니다.');
    return HttpResponse.json({
      newUsers: 128,
      activeUsers: 3400,
      mealRecordCount: 41000,
      inquiryCount: 12,
    });
  }),
  http.post('/admin/stats/reaggregate', ({ request }) => {
    if (!adminOk(request)) return err(403, 'AUTH_FORBIDDEN', '관리자 권한이 필요합니다.');
    return HttpResponse.json({ accepted: true }, { status: 202 });
  }),

  http.get('/admin/users', ({ request }) => {
    if (!adminOk(request)) return err(403, 'AUTH_FORBIDDEN', '관리자 권한이 필요합니다.');
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const size = Number(url.searchParams.get('size') ?? 15);
    return HttpResponse.json(paginated(page, size, 'user'));
  }),
  http.patch('/admin/users/:id/deactivate', ({ request }) => {
    if (!adminOk(request)) return err(403, 'AUTH_FORBIDDEN', '관리자 권한이 필요합니다.');
    return HttpResponse.json({ ok: true });
  }),

  http.get('/admin/foods', ({ request }) => {
    if (!adminOk(request)) return err(403, 'AUTH_FORBIDDEN', '관리자 권한이 필요합니다.');
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const size = Number(url.searchParams.get('size') ?? 15);
    return HttpResponse.json(paginated(page, size, 'food'));
  }),
  http.post('/admin/foods', ({ request }) => {
    if (!adminOk(request)) return err(403, 'AUTH_FORBIDDEN', '관리자 권한이 필요합니다.');
    return HttpResponse.json({ id: 'food_new' }, { status: 201 });
  }),
  http.put('/admin/foods/:id', ({ request }) => {
    if (!adminOk(request)) return err(403, 'AUTH_FORBIDDEN', '관리자 권한이 필요합니다.');
    return HttpResponse.json({ ok: true });
  }),
  http.patch('/admin/foods/:id/deactivate', ({ request }) => {
    if (!adminOk(request)) return err(403, 'AUTH_FORBIDDEN', '관리자 권한이 필요합니다.');
    return HttpResponse.json({ ok: true });
  }),

  http.get('/admin/inquiries', ({ request }) => {
    if (!adminOk(request)) return err(403, 'AUTH_FORBIDDEN', '관리자 권한이 필요합니다.');
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const size = Number(url.searchParams.get('size') ?? 15);
    return HttpResponse.json(paginated(page, size, 'inquiry'));
  }),
  http.patch('/admin/inquiries/:id/status', ({ request }) => {
    if (!adminOk(request)) return err(403, 'AUTH_FORBIDDEN', '관리자 권한이 필요합니다.');
    return HttpResponse.json({ ok: true });
  }),
  http.patch('/admin/inquiries/:id/deactivate', ({ request }) => {
    if (!adminOk(request)) return err(403, 'AUTH_FORBIDDEN', '관리자 권한이 필요합니다.');
    return HttpResponse.json({ ok: true });
  }),

  http.get('/admin/notices', ({ request }) => {
    if (!adminOk(request)) return err(403, 'AUTH_FORBIDDEN', '관리자 권한이 필요합니다.');
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const size = Number(url.searchParams.get('size') ?? 15);
    return HttpResponse.json(paginated(page, size, 'notice'));
  }),
  http.post('/admin/notices', ({ request }) => {
    if (!adminOk(request)) return err(403, 'AUTH_FORBIDDEN', '관리자 권한이 필요합니다.');
    return HttpResponse.json({ id: 'notice_new' }, { status: 201 });
  }),
  http.put('/admin/notices/:id', ({ request }) => {
    if (!adminOk(request)) return err(403, 'AUTH_FORBIDDEN', '관리자 권한이 필요합니다.');
    return HttpResponse.json({ ok: true });
  }),
  http.patch('/admin/notices/:id/deactivate', ({ request }) => {
    if (!adminOk(request)) return err(403, 'AUTH_FORBIDDEN', '관리자 권한이 필요합니다.');
    return HttpResponse.json({ ok: true });
  }),
];
