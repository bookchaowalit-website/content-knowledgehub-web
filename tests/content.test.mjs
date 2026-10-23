import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { getEntries, getEntryBySlug, searchEntries } from '../lib/mdx.ts';
import { renderEntry } from '../lib/render-entry.ts';

test('all four categories contain readable public entries with complete metadata', async () => {
  assert.ok(getEntries().length >= 12);
  for (const category of ['diary', 'knowledge', 'docs', 'ideas']) {
    const entries = getEntries(category);
    assert.ok(entries.length >= 3, category);
    for (const entry of entries) {
      const meta = entry.frontmatter;
      assert.ok(meta.title && meta.description && /^\d{4}-\d{2}-\d{2}$/.test(meta.date));
      assert.ok(Array.isArray(meta.tags) && meta.tags.length > 0);
      assert.ok(entry.content.trim().length > 500, entry.slug);
      assert.deepEqual(getEntryBySlug(category, entry.slug), entry);
      const html = await renderEntry(entry.content);
      assert.match(html, /<h[12]>/);
      assert.match(html, /<p>/);
      for (const match of entry.content.matchAll(/~~~js\n([\s\S]*?)~~~/g)) {
        const run = spawnSync(process.execPath, ['--input-type=module','-'], { input:match[1], encoding:'utf8',timeout:10000 });
        assert.equal(run.status, 0, entry.slug + ': ' + run.stderr);
      }
    }
  }
});
test('the page renderer converts Markdown structure and escapes HTML code', async () => {
  const html = await renderEntry('# Heading\n\n[Reference](https://example.com)\n\n```html\n<script>example</script>\n```');
  assert.match(html, /<h1>Heading<\/h1>/);
  assert.match(html, /href="https:\/\/example.com"/);
  assert.match(html, /(?:&lt;|&#x3C;)script(?:&gt;|>)/);
  assert.doesNotMatch(html, /<script>/);
});
test('public content is searchable and diary publication has an explicit manual gate', async () => {
  assert.ok((await searchEntries('BigInt')).some(entry => entry.slug === 'big-integer-inputs'));
  const policy = getEntryBySlug('docs', 'publication-policy');
  assert.ok(policy);
  assert.match(policy.content, /owner review/i);
  assert.match(policy.content, /private diar/i);
});
test('every entry carries the category of its folder, so home links resolve', () => {
  const all = getEntries();
  assert.equal(all.length, ['diary', 'knowledge', 'docs', 'ideas'].reduce((n, c) => n + getEntries(c).length, 0));
  for (const entry of all) {
    assert.ok(['diary', 'knowledge', 'docs', 'ideas'].includes(entry.frontmatter.category), entry.slug);
    assert.ok(getEntryBySlug(entry.frontmatter.category, entry.slug), `${entry.frontmatter.category}/${entry.slug}`);
  }
  for (const category of ['knowledge', 'docs', 'ideas']) {
    assert.ok(all.filter(entry => entry.frontmatter.category === category).length >= 3, category);
  }
});
