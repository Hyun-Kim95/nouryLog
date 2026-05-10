import { createStitch, STITCH, writeJson } from './lib/client';

async function main() {
  const { sdk, client } = createStitch();
  console.log('[stitch] healthcheck — listing projects');

  const projects = await sdk.projects();
  console.log(`[stitch] projects: ${projects.length}`);
  const target = projects.find((p) => p.projectId === STITCH.PROJECT_ID);
  if (!target) {
    throw new Error(`기대 projectId(${STITCH.PROJECT_ID})가 응답에 없습니다.`);
  }
  console.log(`[stitch] target project found: ${target.projectId}`);

  const screens = await target.screens();
  console.log(`[stitch] existing screens: ${screens.length}`);
  for (const s of screens) {
    console.log(`  - ${s.screenId}`);
  }

  const ds = await target.listDesignSystems();
  console.log(`[stitch] design systems: ${ds.length}`);
  for (const item of ds) {
    const id = (item as unknown as { id?: string; assetId?: string }).id ??
      (item as unknown as { assetId?: string }).assetId ??
      'unknown';
    console.log(`  - ${id}`);
  }

  writeJson('00-healthcheck.json', {
    projectId: target.projectId,
    existingScreens: screens.map((s) => s.screenId),
    designSystems: ds.map((d) => {
      const anyD = d as unknown as Record<string, unknown>;
      return {
        id: anyD.id ?? anyD.assetId,
        displayName: anyD.displayName ?? null,
      };
    }),
    completedAt: new Date().toISOString(),
  });

  await client.close();
  console.log('[stitch] healthcheck OK');
}

main().catch((err) => {
  console.error('[stitch] healthcheck FAILED');
  console.error(err);
  process.exit(1);
});
