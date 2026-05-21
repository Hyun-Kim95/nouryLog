/**
 * Hard-delete inactive rows past retention (deactivatedAt + 1 year).
 * Usage: node scripts/purge-inactive.mjs  (from apps/server, after build or via tsx)
 */
import '../src/loadEnv.js';
import { prisma } from '../src/lib/prisma.js';
import { runPurgeInactive } from '../src/lib/purgeInactive.js';

const result = await runPurgeInactive(prisma);
console.log(JSON.stringify(result, null, 2));
await prisma.$disconnect();
