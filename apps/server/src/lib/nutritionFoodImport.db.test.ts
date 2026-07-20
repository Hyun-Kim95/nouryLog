import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import '../loadEnv.js';
import { prisma } from './prisma.js';
import { runNutritionFoodImport } from '../../scripts/import-nutrition-food.js';

const stamp = Date.now();
const extGood = `IMP-GOOD-${stamp}`;
const extBad = `IMP-BAD-${stamp}`;

describe('nutritionFoodImport DB upsert (AC-01, AC-11)', () => {
  let tmpFile: string;

  before(() => {
    tmpFile = path.join(os.tmpdir(), `nf-import-${stamp}.json`);
    fs.writeFileSync(
      tmpFile,
      JSON.stringify([
        {
          source: 'MFDS',
          externalId: extGood,
          name: `임포트정상 ${stamp}`,
          per100gCalories: 111,
          per100gProtein: 11,
          per100gFat: 1.1,
          per100gCarbohydrate: 2.2,
          defaultServingGrams: 100,
        },
        {
          source: 'MFDS',
          externalId: extBad,
          name: `임포트음수 ${stamp}`,
          per100gCalories: -5,
          per100gProtein: 1,
          per100gFat: 1,
          per100gCarbohydrate: 1,
        },
      ]),
      'utf8',
    );
  });

  after(async () => {
    await prisma.nutritionFood.deleteMany({
      where: { externalId: { in: [extGood, extBad] } },
    });
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      /* ignore */
    }
    await prisma.$disconnect();
  });

  it('AC-01: upsert writes macros; AC-11: negative row skipped, exit 0 when valid rows exist', async () => {
    const report = await runNutritionFoodImport({
      file: tmpFile,
      sourceVersion: `acc-${stamp}`,
    });
    assert.equal(report.exitCode, 0);
    assert.equal(report.upserted, 1);
    assert.ok(report.skipped >= 1);

    const row = await prisma.nutritionFood.findUnique({
      where: { source_externalId: { source: 'MFDS', externalId: extGood } },
    });
    assert.ok(row);
    assert.equal(row!.per100gCalories, 111);
    assert.equal(row!.per100gProtein, 11);
    assert.equal(row!.sourceVersion, `acc-${stamp}`);

    const bad = await prisma.nutritionFood.findUnique({
      where: { source_externalId: { source: 'MFDS', externalId: extBad } },
    });
    assert.equal(bad, null);

    const again = await runNutritionFoodImport({
      file: tmpFile,
      sourceVersion: `acc-${stamp}-r2`,
    });
    assert.equal(again.exitCode, 0);
    assert.equal(again.upserted, 1);
    const row2 = await prisma.nutritionFood.findUnique({
      where: { source_externalId: { source: 'MFDS', externalId: extGood } },
    });
    assert.equal(row2!.sourceVersion, `acc-${stamp}-r2`);
  });

  it('AC-11: missing file exit ≠ 0', async () => {
    const report = await runNutritionFoodImport({
      file: path.join(os.tmpdir(), `nf-missing-${stamp}.json`),
      sourceVersion: 'x',
    });
    assert.notEqual(report.exitCode, 0);
  });
});
