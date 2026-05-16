import { createStitch, STITCH, writeJson } from './lib/client.js';
import { BRIEFS_SPLIT } from './lib/briefs-split.js';

type GeneratedRecord = {
  key: string;
  title: string;
  deviceType: string;
  screenId: string | null;
  htmlUrl: string | null;
  imageUrl: string | null;
  generatedAt: string;
  promptHash: string;
  error?: string;
};

function hashPrompt(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return `h${(h >>> 0).toString(16)}`;
}

async function main() {
  const { sdk, client } = createStitch();
  const project = sdk.project(STITCH.PROJECT_ID);
  const records: GeneratedRecord[] = [];

  for (const brief of BRIEFS_SPLIT) {
    const startedAt = new Date().toISOString();
    console.log(`\n[stitch] generating ${brief.key} (${brief.deviceType})`);
    try {
      const screen = await project.generate(brief.prompt, brief.deviceType);
      const htmlUrl = await screen.getHtml().catch(() => null);
      const imageUrl = await screen.getImage().catch(() => null);
      const record: GeneratedRecord = {
        key: brief.key,
        title: brief.title,
        deviceType: brief.deviceType,
        screenId: screen.screenId,
        htmlUrl,
        imageUrl,
        generatedAt: startedAt,
        promptHash: hashPrompt(brief.prompt),
      };
      records.push(record);
      console.log(`[stitch] ${brief.key} OK — screenId=${screen.screenId}`);
      writeJson('08-generated-split-screens.json', records);
    } catch (err) {
      console.error(`[stitch] ${brief.key} FAILED`);
      console.error(err);
      records.push({
        key: brief.key,
        title: brief.title,
        deviceType: brief.deviceType,
        screenId: null,
        htmlUrl: null,
        imageUrl: null,
        generatedAt: startedAt,
        promptHash: hashPrompt(brief.prompt),
        error: err instanceof Error ? err.message : String(err),
      });
      writeJson('08-generated-split-screens.json', records);
    }
  }

  await client.close();

  const ok = records.filter((r) => r.screenId).length;
  console.log(`\n[stitch] generated ${ok}/${records.length} split screens`);
  if (ok === 0) process.exit(2);
}

main().catch((err) => {
  console.error('[stitch] generate-split FAILED');
  console.error(err);
  process.exit(1);
});
