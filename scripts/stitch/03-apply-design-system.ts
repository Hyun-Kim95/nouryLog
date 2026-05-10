import { createStitch, STITCH, readJson, writeJson } from './lib/client.js';

type GeneratedRecord = {
  key: string;
  screenId: string | null;
};

const NEW_DS_ASSET_ID = STITCH.DESIGN_SYSTEM_ASSET_ID.replace(/^assets\//, '');

async function main() {
  const generated = readJson<GeneratedRecord[]>('02-generated-screens.json');
  const valid = generated.filter((g) => g.screenId);
  if (valid.length === 0) {
    throw new Error('생성된 screenId가 없습니다. 02-generate-screens 먼저 실행하세요.');
  }

  const { sdk, client } = createStitch();
  const project = sdk.project(STITCH.PROJECT_ID);

  console.log(`[stitch] applying DS v1 (${NEW_DS_ASSET_ID}) to ${valid.length} new screens`);

  let result: unknown = null;
  let error: string | null = null;
  try {
    const callResult = await client.callTool('apply_design_system', {
      projectId: STITCH.PROJECT_ID,
      assetId: NEW_DS_ASSET_ID,
      selectedScreenInstances: valid.map((g) => ({
        sourceScreen: `projects/${STITCH.PROJECT_ID}/screens/${g.screenId}`,
      })),
    });
    result = callResult;
    console.log('[stitch] apply_design_system OK');
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    console.warn(`[stitch] apply_design_system 실패 (생성 시 자동 적용된 DS를 그대로 사용): ${error}`);
  }

  await client.close();

  writeJson('03-apply-design-system.json', {
    targetScreens: valid.map((g) => g.screenId),
    appliedAssetId: NEW_DS_ASSET_ID,
    result: result ? JSON.parse(JSON.stringify(result)) : null,
    error,
    completedAt: new Date().toISOString(),
  });
}

main().catch((err) => {
  console.error('[stitch] apply-ds FAILED');
  console.error(err);
  process.exit(1);
});
