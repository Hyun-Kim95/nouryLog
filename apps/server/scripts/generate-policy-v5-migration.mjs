/**
 * Reads docs/legal/privacy.md and writes prisma migration SQL for PolicyDocument v5.
 * Run from repo root: node apps/server/scripts/generate-policy-v5-migration.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const privacy = fs.readFileSync(path.join(repoRoot, 'docs/legal/privacy.md'), 'utf8');

function sqlBody(tag, body) {
  return `$${tag}$${body}$${tag}$`;
}

const outDir = path.join(__dirname, '../prisma/migrations/20260615120100_policy_insights_v5');
fs.mkdirSync(outDir, { recursive: true });

const sql = `-- Policy v5: 식단 인사이트 — docs/legal/privacy.md sync.
UPDATE "PolicyDocument"
SET body = ${sqlBody('privacy', privacy)},
    version = 5,
    "publishedAt" = COALESCE("publishedAt", NOW()),
    "updatedAt" = NOW()
WHERE kind = 'privacy';
`;

fs.writeFileSync(path.join(outDir, 'migration.sql'), sql, 'utf8');
console.log('Wrote', path.join(outDir, 'migration.sql'));
