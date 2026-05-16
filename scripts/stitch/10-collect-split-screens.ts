import fs from 'node:fs';
import path from 'node:path';
import { STITCH, ensureOutDir, readJson, writeJson } from './lib/client.js';

type ApplyResult = {
  result?: {
    outputComponents?: Array<{
      design?: {
        screens?: Array<{
          id: string;
          deviceType: string;
          title?: string;
          htmlCode?: { downloadUrl?: string };
        }>;
      };
    }>;
  };
};

type GeneratedRecord = { key: string; screenId: string | null };

async function downloadHtml(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  fs.writeFileSync(dest, await res.text(), 'utf-8');
}

async function main() {
  ensureOutDir();
  const apply = readJson<ApplyResult>('09-apply-split-design-system.json');
  const generated = readJson<GeneratedRecord[]>('08-generated-split-screens.json');
  const polished = apply.result?.outputComponents?.[0]?.design?.screens ?? [];

  const summary =
    polished.length > 0
      ? polished.map((s, idx) => ({
          key: generated[idx]?.key ?? `SCREEN_${idx}`,
          polishedScreenId: s.id,
          title: s.title ?? null,
          deviceType: s.deviceType,
          htmlDownloadUrl: s.htmlCode?.downloadUrl ?? null,
        }))
      : generated
          .filter((g) => g.screenId)
          .map((g) => ({
            key: g.key,
            polishedScreenId: g.screenId!,
            title: null,
            deviceType: null,
            htmlDownloadUrl: null,
          }));

  const htmlDir = path.join(ensureOutDir(), 'html-split');
  if (!fs.existsSync(htmlDir)) fs.mkdirSync(htmlDir, { recursive: true });

  for (const item of summary) {
    if (!item.htmlDownloadUrl) continue;
    try {
      await downloadHtml(item.htmlDownloadUrl, path.join(htmlDir, `${item.key}.html`));
      console.log(`[stitch] downloaded ${item.key}`);
    } catch (err) {
      console.warn(`[stitch] ${item.key}: ${err instanceof Error ? err.message : err}`);
    }
  }

  const lines = [
    '# Stitch 4차 세트 — 합본 화면 분리 + 개인정보처리방침',
    '',
    `프로젝트: ${STITCH.PROJECT_ID}`,
    `수집: ${new Date().toISOString()}`,
    '',
    '| Key | Polished Screen ID | Device | Title |',
    '| --- | --- | --- | --- |',
    ...summary.map(
      (s) => `| ${s.key} | \`${s.polishedScreenId}\` | ${s.deviceType ?? '-'} | ${s.title ?? '-'} |`,
    ),
  ];
  fs.writeFileSync(path.join(ensureOutDir(), '10-collected-split.md'), lines.join('\n'), 'utf-8');
  writeJson('10-collected-split.json', summary);
  console.log(`\n[stitch] collected ${summary.length} split screens`);
}

main().catch((err) => {
  console.error('[stitch] collect-split FAILED');
  console.error(err);
  process.exit(1);
});
