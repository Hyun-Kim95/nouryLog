import type { Response } from 'express';
import { ErrorCodes, type ErrorCode } from '../contracts/errorCodes.js';

export function sendError(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
  details: Record<string, unknown> = {},
) {
  const traceId = String(res.locals.traceId ?? 'unknown');
  res.status(status).json({ code, message, details, traceId });
}

export { ErrorCodes };
