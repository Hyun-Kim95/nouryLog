#!/usr/bin/env node
/**
 * Seed nutrition_kb embeddings from apps/server/data/nutrition-kb/*.md
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import '../src/loadEnv.js';
import { indexKnowledgeDocument } from '../src/services/vector/aiIndexWorker.js';
import { isAiEnabled } from '../src/lib/aiConfig.js';
import { prisma } from '../src/lib/prisma.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const kbDir = path.join(__dirname, '..', 'data', 'nutrition-kb');

async function main() {
  if (!isAiEnabled()) {
    console.error('AI_ENABLED is off');
    process.exit(1);
  }

  const files = fs.readdirSync(kbDir).filter((f) => f.endsWith('.md'));
  console.log(`Seeding ${files.length} knowledge documents…`);

  let indexed = 0;
  for (const file of files) {
    const raw = fs.readFileSync(path.join(kbDir, file), 'utf8');
    const titleMatch = raw.match(/^#\s+(.+)$/m);
    const title = titleMatch?.[1]?.trim() ?? file.replace(/\.md$/, '');
    const body = raw.replace(/^#\s+.+$/m, '').trim();
    const sourceId = file.replace(/\.md$/, '');
    const result = await indexKnowledgeDocument({ sourceId, title, body });
    if (result.indexed) indexed += 1;
    console.log(`  ${file}: indexed=${result.indexed}`);
  }

  console.log(`Done: ${indexed}/${files.length} indexed`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
