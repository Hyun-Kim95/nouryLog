import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { prisma } from '../lib/prisma.js';
import { sendError, ErrorCodes } from '../lib/errors.js';
import { handleInsightSummary } from '../services/ai/aiCoachSummaryService.js';
import { handleWeeklyReport } from '../services/ai/aiWeeklyReportService.js';
import { handleMonthlyReport } from '../services/ai/aiMonthlyReportService.js';
import { parseAnchorDate } from '../lib/statsPeriod.js';

export const meInsightsRouter = Router();
meInsightsRouter.use(requireAuth);

meInsightsRouter.use(async (req, res, next) => {
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

function parseAnchorQuery(anchorRaw: unknown): string | null {
  if (anchorRaw === undefined || anchorRaw === null || anchorRaw === '') return null;
  return String(anchorRaw);
}

meInsightsRouter.get('/me/insights/summary', async (req, res) => {
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
    const result = await handleInsightSummary(userId, parseAnchorQuery(anchorRaw));
    res.json(result);
  } catch (e) {
    const err = e as Error & { code?: string; field?: string };
    if (err.code === 'VALIDATION_FAILED') {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'anchor를 확인해 주세요.', {
        field: err.field ?? 'anchor',
      });
      return;
    }
    console.error('[insights/summary]', err);
    sendError(res, 500, ErrorCodes.INTERNAL_SERVER_ERROR, '서버 오류가 발생했습니다.');
  }
});

meInsightsRouter.get('/me/insights/reports/weekly', async (req, res) => {
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
    const result = await handleWeeklyReport(userId, parseAnchorQuery(anchorRaw));
    res.json(result);
  } catch (e) {
    const err = e as Error & { code?: string; field?: string };
    if (err.code === 'VALIDATION_FAILED') {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'anchor를 확인해 주세요.', {
        field: err.field ?? 'anchor',
      });
      return;
    }
    console.error('[insights/reports/weekly]', err);
    sendError(res, 500, ErrorCodes.INTERNAL_SERVER_ERROR, '서버 오류가 발생했습니다.');
  }
});

meInsightsRouter.get('/me/insights/reports/monthly', async (req, res) => {
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
    const result = await handleMonthlyReport(userId, parseAnchorQuery(anchorRaw));
    res.json(result);
  } catch (e) {
    const err = e as Error & { code?: string; field?: string };
    if (err.code === 'VALIDATION_FAILED') {
      sendError(res, 422, ErrorCodes.VALIDATION_FAILED, 'anchor를 확인해 주세요.', {
        field: err.field ?? 'anchor',
      });
      return;
    }
    console.error('[insights/reports/monthly]', err);
    sendError(res, 500, ErrorCodes.INTERNAL_SERVER_ERROR, '서버 오류가 발생했습니다.');
  }
});
