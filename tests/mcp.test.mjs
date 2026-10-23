import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleMcpRequest } from '../lib/mcp.ts';
import * as content from '../lib/mdx.ts';

const call = (method, params, id = 7) => handleMcpRequest({ jsonrpc: '2.0', id, method, params }, content);

test('initialize and tools/list describe the four content tools', async () => {
  const init = await call('initialize');
  assert.equal(init.status, 200);
  assert.equal(init.body.result.serverInfo.name, 'Knowledge Hub API');
  const list = await call('tools/list');
  assert.equal(list.body.id, 7);
  assert.deepEqual(list.body.result.tools.map(t => t.name), ['get_entries', 'get_entry_by_slug', 'search_entries', 'get_categories']);
});

test('get_entries filters by category, honours limit and leaves out the body', async () => {
  const { body } = await call('tools/call', { name: 'get_entries', arguments: { category: 'docs', limit: 2 } });
  assert.equal(body.result.length, 2);
  for (const entry of body.result) {
    assert.equal(entry.content, undefined);
    assert.ok(content.getEntryBySlug('docs', entry.slug));
  }
});

test('search_entries finds a hit and returns nothing for a miss', async () => {
  const hit = await call('tools/call', { name: 'search_entries', arguments: { query: 'BigInt' } });
  assert.ok(hit.body.result.some(e => e.slug === 'big-integer-inputs'));
  const miss = await call('tools/call', { name: 'search_entries', arguments: { query: 'zz-no-such-term-qq' } });
  assert.deepEqual(miss.body.result, []);
});

test('get_entry_by_slug rejects unknown categories instead of reading outside content/', async () => {
  const known = await call('tools/call', { name: 'get_entry_by_slug', arguments: { category: 'docs', slug: 'publication-policy' } });
  assert.equal(known.body.result.slug, 'publication-policy');
  const escape = await call('tools/call', { name: 'get_entry_by_slug', arguments: { category: '..', slug: 'README' } });
  assert.equal(escape.status, 400);
  assert.equal(escape.body.error.code, -32602);
});

test('unknown methods and tools are JSON-RPC errors that keep the request id', async () => {
  const method = await call('nope');
  assert.equal(method.body.error.code, -32601);
  assert.equal(method.body.id, 7);
  const tool = await call('tools/call', { name: 'nope' });
  assert.equal(tool.body.error.code, -32601);
});
