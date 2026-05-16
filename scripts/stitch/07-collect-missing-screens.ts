import fs from 'node:fs';
import path from 'node:path';
import { STITCH, ensureOutDir, readJson, writeJson } from './lib/client.js';

type ApplyResult = {
  result?: {
    outputComponents?: Array<{
      design?: {
        screens?: Array<{
          id: string;
          name: string;
          deviceType: string;
          title?: string;
          width?: string;
          height?: string;
          htmlCode?: { downloadUrl?: string };
        }>;
      };
    }>;
  };
};

type GeneratedRecord = { key: string; screenId: string | null };

async function downloadHtml(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`download ${url} failed: ${res.status}`);
  }
  const text = await res.text();
  fs.writeFileSync(dest, text, 'utf-8');
}

async function main() {
  ensureOutDir();
  const apply = readJson<ApplyResult>('06-apply-missing-design-system.json');
  const generated = readJson<GeneratedRecord[]>('05-generated-missing-screens.json');

  const polished = apply.result?.outputComponents?.[0]?.design?.screens ?? [];
  const summary =
    polished.length > 0
      ? polished.map((s, idx) => ({
          key: generated[idx]?.key ?? `SCREEN_${idx}`,
          polishedScreenId: s.id,
          title: s.title ?? null,
          deviceType: s.deviceType,
          width: s.width,
          height: s.height,
          htmlDownloadUrl: s.htmlCode?.downloadUrl ?? null,
        }))
      : generated
          .filter((g) => g.screenId)
          .map((g) => ({
            key: g.key,
            polishedScreenId: g.screenId!,
            title: null,
            deviceType: null,
            width: null,
            height: null,
            htmlDownloadUrl: null,
          }));

  const htmlDir = path.join(ensureOutDir(), 'html-missing');
  if (!fs.existsSync(htmlDir)) fs.mkdirSync(htmlDir, { recursive: true });

  for (const item of summary) {
    if (!item.htmlDownloadUrl) continue;
    const dest = path.join(htmlDir, `${item.key}.html`);
    try {
      await downloadHtml(item.htmlDownloadUrl, dest);
      console.log(`[stitch] downloaded ${item.key}`);
    } catch (err) {
      console.warn(
        `[stitch] ${item.key} html 다운로드 실패: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  const memoLines = [
    '# Stitch 3차 세트 — 빠졌던 모바일 화면',
    '',
    `프로젝트: ${STITCH.PROJECT_ID}`,
    `디자인 시스템: ${STITCH.DESIGN_SYSTEM_ASSET_ID}`,
    `수집 시각: ${new Date().toISOString()}`,
    '',
    '| Key | Polished Screen ID | Device | Title |',
    '| --- | --- | --- | --- |',
    ...summary.map(
      (s) =>
        `| ${s.key} | \`${s.polishedScreenId}\` | ${s.deviceType ?? '-'} | ${s.title ?? '-'} |`,
    ),
  ];
  fs.writeFileSync(path.join(ensureOutDir(), '07-collected-missing.md'), memoLines.join('\n'), 'utf-8');
  writeJson('07-collected-missing.json', summary);
  console.log(`\n[stitch] collected ${summary.length} missing screens`);
}

main().catch((err) => {
  console.error('[stitch] collect-missing FAILED');
  console.error(err);
  process.exit(1);
});
