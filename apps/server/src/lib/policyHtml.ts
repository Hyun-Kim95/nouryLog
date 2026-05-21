import MarkdownIt from 'markdown-it';

const POLICY_TITLES: Record<'terms' | 'privacy', string> = {
  terms: '이용약관',
  privacy: '개인정보처리방침',
};

/** DB에 저장된 마크다운 본문 → 공개 HTML (raw HTML 비활성). */
const policyMarkdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
});

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function markdownBodyToHtml(body: string): string {
  return policyMarkdown.render(body);
}

export function renderPolicyHtmlPage(
  kind: 'terms' | 'privacy',
  body: string,
  meta: { version: number; publishedAt: string; updatedAt: string },
): string {
  const title = `nouryLog ${POLICY_TITLES[kind]}`;
  const contentHtml = markdownBodyToHtml(body);
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.65; max-width: 48rem; margin: 0 auto; padding: 1.5rem; color: #111; background: #fff; }
    h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
    h2 { font-size: 1.2rem; margin: 1.75rem 0 0.75rem; }
    h3 { font-size: 1.05rem; margin: 1.25rem 0 0.5rem; }
    .meta { color: #666; font-size: 0.875rem; margin-bottom: 1.5rem; }
    .policy-body p { margin: 0.75rem 0; }
    .policy-body ul, .policy-body ol { margin: 0.5rem 0 0.75rem; padding-left: 1.5rem; }
    .policy-body li { margin: 0.35rem 0; }
    .policy-body hr { border: none; border-top: 1px solid #ddd; margin: 1.5rem 0; }
    .policy-body blockquote { margin: 1rem 0; padding: 0.5rem 1rem; border-left: 3px solid #ccc; color: #444; background: #f8f8f8; }
    .policy-body table { width: 100%; border-collapse: collapse; font-size: 0.9rem; margin: 1rem 0; }
    .policy-body th, .policy-body td { border: 1px solid #ddd; padding: 0.5rem 0.65rem; text-align: left; vertical-align: top; }
    .policy-body th { background: #f5f5f5; }
    .policy-body a { color: #1565c0; }
    .policy-body strong { font-weight: 600; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">버전 ${meta.version} · 게시 ${meta.publishedAt.slice(0, 10)} · 수정 ${meta.updatedAt.slice(0, 10)}</p>
  <article class="policy-body">${contentHtml}</article>
</body>
</html>`;
}
