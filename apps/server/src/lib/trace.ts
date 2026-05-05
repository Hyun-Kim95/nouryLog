import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export function traceMiddleware(req: Request, res: Response, next: NextFunction) {
  const traceId = (req.header('x-trace-id') ?? randomUUID()).toString();
  res.locals.traceId = traceId;
  res.setHeader('x-trace-id', traceId);
  next();
}
