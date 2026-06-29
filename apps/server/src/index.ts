import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { traceMiddleware } from './lib/trace.js';
import { sendError, ErrorCodes } from './lib/errors.js';
import { publicRouter } from './routes/public.js';
import { meRouter } from './routes/me.js';
import { mealSetRouter } from './routes/mealSet.js';
import { meInsightsRouter } from './routes/meInsights.js';
import { adminRouter } from './routes/admin.js';

const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT ?? '6mb';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? path.join(__dirname, '..', 'uploads'));

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(traceMiddleware);

fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'diet-management-api', contract: 'v1.6.0' });
});

app.use(publicRouter);
app.use(mealSetRouter);
app.use(meRouter);
app.use(meInsightsRouter);
app.use(adminRouter);

app.use(
  (
    err: Error & { type?: string; status?: number },
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    if (err.type === 'entity.too.large' || err.status === 413) {
      sendError(
        res,
        413,
        ErrorCodes.VALIDATION_FAILED,
        '이미지가 너무 커요. 다른 사진을 선택하거나 해상도를 낮춰 주세요.',
      );
      return;
    }
    sendError(res, 500, ErrorCodes.INTERNAL_SERVER_ERROR, '서버 오류가 발생했습니다.');
  },
);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
