import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { traceMiddleware } from './lib/trace.js';
import { publicRouter } from './routes/public.js';
import { meRouter } from './routes/me.js';
import { adminRouter } from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? path.join(__dirname, '..', 'uploads'));

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(traceMiddleware);

fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

app.use(publicRouter);
app.use(meRouter);
app.use(adminRouter);

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'diet-management-api', contract: 'v1.4.0' });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
