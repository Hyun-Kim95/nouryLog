const POLICY_TITLES: Record<'terms' | 'privacy', string> = {
  terms: '이용약관',
  privacy: '개인정보처리방침',
};

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderPolicyHtmlPage(
  kind: 'terms' | 'privacy',
  body: string,
  meta: { version: number; publishedAt: string; updatedAt: string },
): string {
  const title = `nouryLog ${POLICY_TITLES[kind]}`;
  const safeBody = escapeHtml(body);
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; line-height: 1.6; max-width: 48rem; margin: 0 auto; padding: 1.5rem; color: #111; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .meta { color: #666; font-size: 0.875rem; margin-bottom: 1.5rem; }
    pre { white-space: pre-wrap; word-break: break-word; font-family: inherit; font-size: 0.9375rem; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">버전 ${meta.version} · 게시 ${meta.publishedAt.slice(0, 10)} · 수정 ${meta.updatedAt.slice(0, 10)}</p>
  <pre>${safeBody}</pre>
</body>
</html>`;
}
