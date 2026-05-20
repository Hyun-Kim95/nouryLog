import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const terms = fs.readFileSync(path.join(root, 'docs/legal/terms.md'), 'utf8');
const privacy = fs.readFileSync(path.join(root, 'docs/legal/privacy.md'), 'utf8');
const dir = path.join(root, 'apps/server/prisma/migrations/20260520120000_policy_free_launch_v2');
fs.mkdirSync(dir, { recursive: true });
const sql = `-- Policy v2: free launch (monthly OCR, no IAP, AdMob). Updates existing PolicyDocument rows.
UPDATE "PolicyDocument"
SET body = $terms$${terms}$terms$,
    version = 2,
    "updatedAt" = NOW()
WHERE kind = 'terms';

UPDATE "PolicyDocument"
SET body = $privacy$${privacy}$privacy$,
    version = 2,
    "updatedAt" = NOW()
WHERE kind = 'privacy';
`;
const out = path.join(dir, 'migration.sql');
fs.writeFileSync(out, sql, 'utf8');
console.log('wrote', out, fs.statSync(out).size, 'bytes');
