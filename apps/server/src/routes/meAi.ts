import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { prisma } from '../lib/prisma.js';
import { sendError, ErrorCodes } from '../lib/errors.js';
import { checkAiRateLimit } from '../lib/aiRateLimit.js';
import { handleAiAsk } from '../services/ai/aiAskService.js';
import { handleWeeklyReport } from '../services/ai/aiWeeklyReportService.js';
import { handleMonthlyReport } from '../services/ai/aiMonthlyReportService.js';
import { handleCoachSummary } from '../services/ai/aiCoachSummaryService.js';
import { parseAnchorDate } from '../lib/statsPeriod.js';

export const meAiRouter = Router();
meAiRouter.use(requireAuth);

meAiRouter.use(async (req, res, next) => {
  if (req.auth!.role !== 'USER') {
    next();
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    select: { active: true },
  });
  if (!user?.active) {
    sendError(res, 403, ErrorCodes.AUTH_FORBIDDEN, '비활성화된 계정입니다.');
    return;
  }
  next();
});

meAiRouter.post('/me/ai/ask', async (req, res) => {
  const userId = req.auth!.userId;
  if (!checkAiRateLimit(userId)) {
    sendError(res, 429, ErrorCodes.AI_RATE_LIMIT, 'AI 질의 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.');
    return;
  }

  const body = req.body as { question?: unknown; contextAnchor?: unknown };
  try {
    const result = await handleAiAsk(userId, {
      question: String(body.question ?? ''),
      contextAnchor:
        body.contextAnchor === undefined || body.contextAnchor === null
          ? null
          : String(body.contextAnchor),
    });
    res.json(result);
  } catch (e) {
    const err = e as Error & { code?: string; field?: string };
    if (err.code === 'AI_QUESTION_TOO_LONG') {
      sendError(res, 422, ErrorCodes.AI_QUESTION_TOO_LONG, '질문은 500자 이내로 입력해 주세요.');
      return;
    }
    if (err.code === 'VALIDATION_FAILED') {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, '입력값을 확인해 주세요.', {
        field: err.field ?? 'question',
      });
      return;
    }
    if (err.code === 'AI_LLM_UNAVAILABLE') {
      sendError(res, 503, ErrorCodes.AI_LLM_UNAVAILABLE, 'AI 분석 서비스를 일시적으로 사용할 수 없습니다.');
      return;
    }
    console.error('[ai/ask]', err);
    sendError(res, 500, ErrorCodes.INTERNAL_SERVER_ERROR, '서버 오류가 발생했습니다.');
  }
});

meAiRouter.get('/me/ai/coach/summary', async (req, res) => {
  const userId = req.auth!.userId;

  const anchorRaw = req.query.anchor;
  if (anchorRaw !== undefined && anchorRaw !== null && anchorRaw !== '') {
    const parsed = parseAnchorDate(anchorRaw);
    if (!parsed) {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'anchor 형식이 올바르지 않습니다.', {
        field: 'anchor',
      });
      return;
    }
  }

  try {
    const anchor =
      anchorRaw === undefined || anchorRaw === null || anchorRaw === ''
        ? null
        : String(anchorRaw);
    const result = await handleCoachSummary(userId, anchor);
    res.json(result);
  } catch (e) {
    const err = e as Error & { code?: string; field?: string };
    if (err.code === 'VALIDATION_FAILED') {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'anchor를 확인해 주세요.', { field: err.field ?? 'anchor' });
      return;
    }
    if (err.code === 'AI_LLM_UNAVAILABLE') {
      sendError(res, 503, ErrorCodes.AI_LLM_UNAVAILABLE, 'AI 분석 서비스를 일시적으로 사용할 수 없습니다.');
      return;
    }
    console.error('[ai/coach/summary]', err);
    sendError(res, 500, ErrorCodes.INTERNAL_SERVER_ERROR, '서버 오류가 발생했습니다.');
  }
});

meAiRouter.get('/me/ai/reports/weekly', async (req, res) => {
  const userId = req.auth!.userId;
  if (!checkAiRateLimit(userId)) {
    sendError(res, 429, ErrorCodes.AI_RATE_LIMIT, 'AI 질의 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.');
    return;
  }

  const anchorRaw = req.query.anchor;
  if (anchorRaw !== undefined && anchorRaw !== null && anchorRaw !== '') {
    const parsed = parseAnchorDate(anchorRaw);
    if (!parsed) {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'anchor 형식이 올바르지 않습니다.', {
        field: 'anchor',
      });
      return;
    }
  }

  try {
    const anchor =
      anchorRaw === undefined || anchorRaw === null || anchorRaw === ''
        ? null
        : String(anchorRaw);
    const result = await handleWeeklyReport(userId, anchor);
    res.json(result);
  } catch (e) {
    const err = e as Error & { code?: string; field?: string };
    if (err.code === 'VALIDATION_FAILED') {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'anchor를 확인해 주세요.', { field: err.field ?? 'anchor' });
      return;
    }
    if (err.code === 'AI_LLM_UNAVAILABLE') {
      sendError(res, 503, ErrorCodes.AI_LLM_UNAVAILABLE, 'AI 분석 서비스를 일시적으로 사용할 수 없습니다.');
      return;
    }
    console.error('[ai/reports/weekly]', err);
    sendError(res, 500, ErrorCodes.INTERNAL_SERVER_ERROR, '서버 오류가 발생했습니다.');
  }
});

meAiRouter.get('/me/ai/reports/monthly', async (req, res) => {
  const userId = req.auth!.userId;
  if (!checkAiRateLimit(userId)) {
    sendError(res, 429, ErrorCodes.AI_RATE_LIMIT, 'AI 질의 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.');
    return;
  }

  const anchorRaw = req.query.anchor;
  if (anchorRaw !== undefined && anchorRaw !== null && anchorRaw !== '') {
    const parsed = parseAnchorDate(anchorRaw);
    if (!parsed) {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'anchor 형식이 올바르지 않습니다.', {
        field: 'anchor',
      });
      return;
    }
  }

  try {
    const anchor =
      anchorRaw === undefined || anchorRaw === null || anchorRaw === ''
        ? null
        : String(anchorRaw);
    const result = await handleMonthlyReport(userId, anchor);
    res.json(result);
  } catch (e) {
    const err = e as Error & { code?: string; field?: string };
    if (err.code === 'VALIDATION_FAILED') {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'anchor를 확인해 주세요.', { field: err.field ?? 'anchor' });
      return;
    }
    if (err.code === 'AI_LLM_UNAVAILABLE') {
      sendError(res, 503, ErrorCodes.AI_LLM_UNAVAILABLE, 'AI 분석 서비스를 일시적으로 사용할 수 없습니다.');
      return;
    }
    console.error('[ai/reports/monthly]', err);
    sendError(res, 500, ErrorCodes.INTERNAL_SERVER_ERROR, '서버 오류가 발생했습니다.');
  }
});
