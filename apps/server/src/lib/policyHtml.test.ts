import assert from 'node:assert/strict';
import test from 'node:test';
import { escapeHtml, markdownBodyToHtml, renderPolicyHtmlPage } from './policyHtml.js';

test('markdownBodyToHtml renders headings and bold', () => {
  const html = markdownBodyToHtml('## 제목\n\n**강조** 문장');
  assert.match(html, /<h2>제목<\/h2>/);
  assert.match(html, /<strong>강조<\/strong>/);
});

test('markdownBodyToHtml renders tables', () => {
  const html = markdownBodyToHtml('| A | B |\n|---|---|\n| 1 | 2 |');
  assert.match(html, /<table>/);
  assert.match(html, /<td>1<\/td>/);
});

test('renderPolicyHtmlPage uses article not pre for body', () => {
  const page = renderPolicyHtmlPage('privacy', '## 본문\n\n내용', {
    version: 2,
    publishedAt: '2026-05-20T00:00:00.000Z',
    updatedAt: '2026-05-20T00:00:00.000Z',
  });
  assert.match(page, /<article class="policy-body">/);
  assert.doesNotMatch(page, /<pre>/);
  assert.match(page, /<h2>본문<\/h2>/);
});

test('escapeHtml escapes script tags in title path', () => {
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
});
