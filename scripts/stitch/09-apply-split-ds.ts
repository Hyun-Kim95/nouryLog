import { createStitch, STITCH, readJson, writeJson } from './lib/client.js';

type GeneratedRecord = { key: string; screenId: string | null };

const NEW_DS_ASSET_ID = STITCH.DESIGN_SYSTEM_ASSET_ID.replace(/^assets\//, '');

async function main() {
  const generated = readJson<GeneratedRecord[]>('08-generated-split-screens.json');
  const valid = generated.filter((g) => g.screenId);
  if (valid.length === 0) {
    throw new Error('08-generated-split-screens.json에 screenId가 없습니다.');
  }

  const { client } = createStitch();
  console.log(`[stitch] applying DS to ${valid.length} split screens`);

  let result: unknown = null;
  let error: string | null = null;
  try {
    result = await client.callTool('apply_design_system', {
      projectId: STITCH.PROJECT_ID,
      assetId: NEW_DS_ASSET_ID,
      selectedScreenInstances: valid.map((g) => ({
        sourceScreen: `projects/${STITCH.PROJECT_ID}/screens/${g.screenId}`,
      })),
    });
    console.log('[stitch] apply_design_system OK');
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    console.warn(`[stitch] apply_design_system 경고: ${error}`);
  }

  await client.close();
  writeJson('09-apply-split-design-system.json', {
    targetScreens: valid.map((g) => ({ key: g.key, screenId: g.screenId })),
    appliedAssetId: NEW_DS_ASSET_ID,
    result: result ? JSON.parse(JSON.stringify(result)) : null,
    error,
    completedAt: new Date().toISOString(),
  });
}

main().catch((err) => {
  console.error('[stitch] apply-split-ds FAILED');
  console.error(err);
  process.exit(1);
});
