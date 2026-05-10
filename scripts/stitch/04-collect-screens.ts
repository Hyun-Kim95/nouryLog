import fs from 'node:fs';
import path from 'node:path';
import { createStitch, STITCH, OUT_DIR, ensureOutDir, readJson, writeJson } from './lib/client.js';

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
          screenshot?: { downloadUrl?: string; name?: string };
          htmlCode?: { downloadUrl?: string; name?: string };
          theme?: Record<string, unknown>;
          designSystem?: { name?: string; version?: string };
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
  const apply = readJson<ApplyResult>('03-apply-design-system.json');
  const generated = readJson<GeneratedRecord[]>('02-generated-screens.json');

  const polished = apply.result?.outputComponents?.[0]?.design?.screens ?? [];
  if (polished.length === 0) {
    throw new Error('apply 결과에서 polished screens를 찾지 못했습니다.');
  }

  const summary = polished.map((s, idx) => ({
    key: generated[idx]?.key ?? `SCREEN_${idx}`,
    polishedScreenId: s.id,
    title: s.title ?? null,
    deviceType: s.deviceType,
    width: s.width,
    height: s.height,
    htmlDownloadUrl: s.htmlCode?.downloadUrl ?? null,
    screenshotDownloadUrl: s.screenshot?.downloadUrl ?? null,
    theme: s.theme ?? null,
    designSystem: s.designSystem ?? null,
  }));

  const htmlDir = path.join(OUT_DIR, 'html');
  if (!fs.existsSync(htmlDir)) fs.mkdirSync(htmlDir, { recursive: true });

  const { client } = createStitch();
  for (const item of summary) {
    if (!item.htmlDownloadUrl) continue;
    const dest = path.join(htmlDir, `${item.key}.html`);
    try {
      await downloadHtml(item.htmlDownloadUrl, dest);
      console.log(`[stitch] downloaded ${item.key} → ${path.relative(process.cwd(), dest)}`);
    } catch (err) {
      console.warn(`[stitch] ${item.key} html 다운로드 실패: ${err instanceof Error ? err.message : err}`);
    }
  }
  await client.close();

  const memoLines = [
    '# Stitch 신규 화면 메모 (Phase A5)',
    '',
    `프로젝트: ${STITCH.PROJECT_ID}`,
    `디자인 시스템: ${STITCH.DESIGN_SYSTEM_ASSET_ID}`,
    `수집 시각: ${new Date().toISOString()}`,
    '',
    '| Key | Polished Screen ID | Device | Title | 크기 |',
    '| --- | --- | --- | --- | --- |',
    ...summary.map(
      (s) =>
        `| ${s.key} | \`${s.polishedScreenId}\` | ${s.deviceType} | ${s.title ?? '-'} | ${s.width}x${s.height} |`,
    ),
    '',
    '> HTML/screenshot 다운로드 URL은 서명된 임시 링크라 본 메모에는 ID만 남깁니다. 원본은 `scripts/stitch/out/03-apply-design-system.json`을 참조하세요.',
  ];
  fs.writeFileSync(path.join(OUT_DIR, '04-collected.md'), memoLines.join('\n'), 'utf-8');

  writeJson('04-collected.json', summary);
  console.log(`\n[stitch] collected ${summary.length} screens`);
}

main().catch((err) => {
  console.error('[stitch] collect FAILED');
  console.error(err);
  process.exit(1);
});
