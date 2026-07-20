#!/usr/bin/env node
import '../src/loadEnv.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../src/lib/prisma.js';
import {
  parseNutritionFoodRows,
  summarizeSkips,
  validateImportArgs,
  type ImportReport,
  type NutritionFoodImportRow,
} from '../src/lib/nutritionFoodImport.js';

const CHUNK = 100;

function parseArgs(argv: string[]): { file?: string; sourceVersion?: string } {
  let file: string | undefined;
  let sourceVersion: string | undefined;
  for (const a of argv) {
    if (a.startsWith('--file=')) file = a.slice('--file='.length);
    else if (a.startsWith('--sourceVersion=')) sourceVersion = a.slice('--sourceVersion='.length);
  }
  return { file, sourceVersion };
}

async function upsertChunk(rows: NutritionFoodImportRow[], importedAt: Date): Promise<void> {
  await prisma.$transaction(
    rows.map((r) => {
      const dataCore = {
        name: r.name,
        nameNormalized: r.nameNormalized,
        category: r.category,
        per100gCalories: r.per100gCalories,
        per100gProtein: r.per100gProtein,
        per100gFat: r.per100gFat,
        per100gCarbohydrate: r.per100gCarbohydrate,
        defaultServingGrams: r.defaultServingGrams,
        sourceVersion: r.sourceVersion,
        importedAt,
        ...(r.rawPayload !== undefined ? { rawPayload: r.rawPayload as object } : {}),
      };
      const activeUpdate =
        r.active === undefined
          ? {}
          : r.active
            ? { active: true, deactivatedAt: null as Date | null }
            : { active: false, deactivatedAt: importedAt };

      return prisma.nutritionFood.upsert({
        where: { source_externalId: { source: r.source, externalId: r.externalId } },
        create: {
          source: r.source,
          externalId: r.externalId,
          ...dataCore,
          active: r.active ?? true,
          deactivatedAt: r.active === false ? importedAt : null,
        },
        update: {
          ...dataCore,
          ...activeUpdate,
        },
      });
    }),
  );
}

export async function runNutritionFoodImport(opts: {
  file: string;
  sourceVersion: string;
}): Promise<ImportReport> {
  const abs = path.resolve(opts.file);
  if (!fs.existsSync(abs)) {
    return {
      upserted: 0,
      skipped: 0,
      skippedByReason: {},
      duplicateInFile: 0,
      sourceVersion: opts.sourceVersion,
      committedChunks: 0,
      exitCode: 1,
      errors: [{ row: 0, code: 'INVALID_MACRO', message: `file not found: ${abs}` }],
    };
  }

  let parsed: unknown;
  try {
    const text = fs.readFileSync(abs, 'utf8');
    parsed = JSON.parse(text);
  } catch (e) {
    return {
      upserted: 0,
      skipped: 0,
      skippedByReason: {},
      duplicateInFile: 0,
      sourceVersion: opts.sourceVersion,
      committedChunks: 0,
      exitCode: 1,
      errors: [{ row: 0, code: 'INVALID_MACRO', message: `parse failed: ${String(e)}` }],
    };
  }

  const arr = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown }).items)
      ? (parsed as { items: unknown[] }).items
      : null;

  if (!arr || arr.length === 0) {
    return {
      upserted: 0,
      skipped: 0,
      skippedByReason: {},
      duplicateInFile: 0,
      sourceVersion: opts.sourceVersion,
      committedChunks: 0,
      exitCode: 1,
      errors: [{ row: 0, code: 'INVALID_MACRO', message: 'empty or invalid JSON array' }],
    };
  }

  const { rows, skipped, duplicateInFile } = parseNutritionFoodRows(arr, opts.sourceVersion);
  if (rows.length === 0) {
    return {
      upserted: 0,
      skipped: skipped.length,
      skippedByReason: summarizeSkips(skipped),
      duplicateInFile,
      sourceVersion: opts.sourceVersion,
      committedChunks: 0,
      exitCode: 1,
      errors: skipped,
    };
  }

  const importedAt = new Date();
  let committedChunks = 0;
  let upserted = 0;
  try {
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      await upsertChunk(chunk, importedAt);
      committedChunks += 1;
      upserted += chunk.length;
    }
  } catch (e) {
    return {
      upserted,
      skipped: skipped.length,
      skippedByReason: summarizeSkips(skipped),
      duplicateInFile,
      sourceVersion: opts.sourceVersion,
      committedChunks,
      exitCode: 1,
      errors: [
        ...skipped,
        { row: 0, code: 'INVALID_MACRO', message: `db error after ${committedChunks} chunks: ${String(e)}` },
      ],
    };
  }

  return {
    upserted,
    skipped: skipped.length,
    skippedByReason: summarizeSkips(skipped),
    duplicateInFile,
    sourceVersion: opts.sourceVersion,
    committedChunks,
    exitCode: 0,
    errors: skipped,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const validated = validateImportArgs(args);
  if (!validated.ok) {
    console.error(JSON.stringify({ exitCode: 1, error: validated.reason }));
    process.exit(1);
  }
  const report = await runNutritionFoodImport(validated);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.exitCode);
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
