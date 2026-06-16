#!/usr/bin/env node
/**
 * Idempotent demo user for insights smoke / local testing (local + production).
 * Usage: DATABASE_URL=... npm run seed:demo-user
 * Set SEED_DEMO_RESET_PASSWORD=0 to skip password overwrite on existing user.
 */
import '../src/loadEnv.js';
import { prisma } from '../src/lib/prisma.js';
import {
  DEMO_USER_EMAIL,
  DEMO_USER_PASSWORD,
  runDemoUserSeed,
} from '../prisma/seedDemoUser.js';

async function main() {
  const resetPassword = process.env.SEED_DEMO_RESET_PASSWORD !== '0';
  await runDemoUserSeed({ resetPassword, reactivate: true });
  console.log(`Demo user OK: ${DEMO_USER_EMAIL} / ${DEMO_USER_PASSWORD} (resetPassword=${resetPassword})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
