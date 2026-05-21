/**
 * Reads docs/legal/*.md and writes prisma migration SQL for PolicyDocument v3.
 * Run from repo root: node apps/server/scripts/generate-policy-v3-migration.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const terms = fs.readFileSync(path.join(repoRoot, 'docs/legal/terms.md'), 'utf8');
const privacy = fs.readFileSync(path.join(repoRoot, 'docs/legal/privacy.md'), 'utf8');

function sqlBody(tag, body) {
  return `$${tag}$${body}$${tag}$`;
}

const outDir = path.join(__dirname, '../prisma/migrations/20260521150000_policy_retention_v3');
fs.mkdirSync(outDir, { recursive: true });

const sql = `-- Policy v3: inactive retention 1 year (docs/legal sync).
UPDATE "PolicyDocument"
SET body = ${sqlBody('terms', terms)},
    version = 3,
    "publishedAt" = COALESCE("publishedAt", NOW()),
    "updatedAt" = NOW()
WHERE kind = 'terms';

UPDATE "PolicyDocument"
SET body = ${sqlBody('privacy', privacy)},
    version = 3,
    "publishedAt" = COALESCE("publishedAt", NOW()),
    "updatedAt" = NOW()
WHERE kind = 'privacy';
`;

fs.writeFileSync(path.join(outDir, 'migration.sql'), sql, 'utf8');
console.log('Wrote', path.join(outDir, 'migration.sql'));
