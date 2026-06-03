#!/usr/bin/env node
/**
 * Index all active meals into AiEmbedding (pgvector).
 * Requires: AI_ENABLED=1, Ollama embed model, pgvector migrated DB.
 */
import '../src/loadEnv.js';
import { prisma } from '../src/lib/prisma.js';
import { indexMeal } from '../src/services/vector/aiIndexWorker.js';
import { isAiEnabled } from '../src/lib/aiConfig.js';

async function main() {
  if (!isAiEnabled()) {
    console.error('AI_ENABLED is off — set apps/server/.env AI_ENABLED=1');
    process.exit(1);
  }

  const meals = await prisma.meal.findMany({
    where: { active: true },
    orderBy: { consumedAt: 'asc' },
  });

  console.log(`Backfilling ${meals.length} active meals…`);
  let indexed = 0;
  let failed = 0;

  for (const meal of meals) {
    const result = await indexMeal(meal);
    if (result.indexed) indexed += 1;
    else failed += 1;
    if ((indexed + failed) % 20 === 0) {
      console.log(`  progress ${indexed + failed}/${meals.length} (indexed=${indexed})`);
    }
  }

  console.log(`Done: indexed=${indexed}, not_indexed=${failed}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
