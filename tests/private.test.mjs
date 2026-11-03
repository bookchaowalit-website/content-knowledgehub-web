import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { test } from 'node:test';
import {
  PRIVATE_HEADERS,
  RAW_HEADERS,
  StoreReader,
  childrenOf,
  mintReadToken,
  readConfig,
  rewriteRelative,
  safePath,
  splitFrontMatter,
  verifyAccess,
  viewFor,
} from '../lib/private.ts';

const accessKey = generateKeyPairSync('rsa', { modulusLength: 2048 });
const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 });
const serviceKey = generateKeyPairSync('rsa', { modulusLength: 2048 });
const NOW = 1_800_000_000;

const ENV = {
  KNOWLEDGE_HUB_ACCESS_TEAM: 'team.cloudflareaccess.com',
  KNOWLEDGE_HUB_ACCESS_AUD: 'aud-tag',
  KNOWLEDGE_HUB_OWNER_EMAILS: 'Owner@Example.com, second@example.com',
  KNOWLEDGE_HUB_PRIVATE_SPACES: 'knowledge-base,architecture-docs',
  EMPIRE_KNOWLEDGE_API: 'https://knowledge.example/',
  KNOWLEDGE_HUB_TOKEN_ISSUER: 'https://solo.example',
  KNOWLEDGE_HUB_OWNER_SUBJECT: 'owner-sub',
  KNOWLEDGE_HUB_SERVICE_KEY: serviceKey.privateKey.export({ type: 'pkcs8', format: 'pem' }).replace(/\n/g, '\\n'),
};
const config = readConfig(ENV);

const b64url = (value) => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
function accessToken(overrides = {}, { key = accessKey.privateKey, kid = 'k1', alg = 'RS256' } = {}) {
  const claims = {
    iss: 'https://team.cloudflareaccess.com',
    aud: ['aud-tag'],
    email: 'owner@example.com',
    iat: NOW - 10,
    nbf: NOW - 10,
    exp: NOW + 600,
    ...overrides,
  };
  const head = b64url({ alg, kid, typ: 'JWT' }) + '.' + b64url(claims);
  const signature = createSign('RSA-SHA256').update(head).sign(key).toString('base64url');
  return head + '.' + signature;
}
const certs = { keys: [{ ...accessKey.publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256' }] };
function certFetch() {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    return new Response(JSON.stringify(certs), { status: 200 });
  };
  return { fetchImpl, calls };
}

test('configuration is complete or absent, never half-set', () => {
  assert.equal(config.api, 'https://knowledge.example');
  assert.deepEqual(config.spaces, ['knowledge-base', 'architecture-docs']);
  assert.ok(config.emails.has('owner@example.com'));
  for (const name of Object.keys(ENV)) {
    assert.equal(readConfig({ ...ENV, [name]: '' }), null, name);
  }
  assert.equal(readConfig({ ...ENV, EMPIRE_KNOWLEDGE_API: 'http://knowledge.example' }), null);
  assert.equal(readConfig({ ...ENV, KNOWLEDGE_HUB_PRIVATE_SPACES: 'ok,../bad' }), null);
});

test('access is checked before any store call', async () => {
  const { fetchImpl, calls } = certFetch();
  const check = (token) => verifyAccess(token, config, { now: NOW, fetchImpl });
  assert.equal(await check(accessToken()), 'owner@example.com');
  assert.deepEqual(calls, ['https://team.cloudflareaccess.com/cdn-cgi/access/certs']);
  const refused = [
    null,
    '',
    'not.a.jwt',
    accessToken({ exp: NOW - 1 }),
    accessToken({ nbf: NOW + 120 }),
    accessToken({ aud: ['other'] }),
    accessToken({ iss: 'https://evil.cloudflareaccess.com' }),
    accessToken({ email: 'stranger@example.com' }),
    accessToken({ email: undefined }),
    accessToken({}, { key: otherKey.privateKey }),
    accessToken({}, { kid: 'unknown' }),
    accessToken({}, { alg: 'none' }),
    accessToken() + 'x',
  ];
  for (const token of refused) assert.equal(await check(token), null, String(token).slice(-12));
  // A certificate endpoint that fails closes the door.
  const down = async () => new Response('', { status: 500 });
  assert.equal(await verifyAccess(accessToken(), config, { now: NOW, fetchImpl: down }), null);
});

test('the store client mints a narrow read token', async () => {
  const token = mintReadToken(config, NOW);
  const [head, body] = token.split('.').slice(0, 2).map((part) => JSON.parse(Buffer.from(part, 'base64url')));
  assert.equal(head.alg, 'RS256');
  assert.deepEqual(
    { ...body, jti: undefined },
    { iss: 'https://solo.example', aud: 'knowledge-api', sub: 'owner-sub', tenant_id: 'owner', scope: 'knowledge:read', iat: NOW, nbf: NOW, exp: NOW + 60, jti: undefined },
  );
  assert.match(body.jti, /^[0-9a-f-]{36}$/);
  assert.notEqual(mintReadToken(config, NOW), token);
});

function fakeApi(documents) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const u = new URL(url);
    calls.push({ path: u.pathname, query: Object.fromEntries(u.searchParams), auth: init.headers.Authorization, cache: init.cache, redirect: init.redirect });
    if (u.pathname === '/api/v1/store/documents') {
      const after = u.searchParams.get('after') || '';
      const limit = Number(u.searchParams.get('limit'));
      const page = documents.filter((d) => d.path > after).slice(0, limit).map(({ body, ...meta }) => meta);
      return new Response(JSON.stringify({ documents: page, total: documents.length }), { status: 200 });
    }
    const doc = documents.find((d) => d.path === u.searchParams.get('path'));
    if (!doc) return new Response(JSON.stringify({ error: { code: 'not_found', message: 'secret detail' } }), { status: 404 });
    const { body, ...meta } = doc;
    return new Response(JSON.stringify({ document: { ...meta, encoding: 'base64', content_base64: Buffer.from(body).toString('base64') } }), { status: 200 });
  };
  return { fetchImpl, calls };
}
const doc = (path, body = 'x', media_type = 'text/markdown') => ({ path, body, media_type, size: body.length, sha256: 'h', visibility: 'private', version: 1, updated_at: '2026-11-03T00:00:00Z' });

test('the reader pages through a space and reads one document', async () => {
  const docs = Array.from({ length: 2005 }, (_, i) => doc(`notes/${String(i).padStart(4, '0')}.md`));
  const { fetchImpl, calls } = fakeApi(docs);
  const reader = new StoreReader(config, fetchImpl);
  const listed = await reader.list('knowledge-base');
  assert.equal(listed.length, 2005);
  assert.deepEqual(calls.map((c) => c.query.after), ['', 'notes/0999.md', 'notes/1999.md']);
  for (const call of calls) {
    assert.match(call.auth, /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
    assert.equal(call.cache, 'no-store');
    assert.equal(call.redirect, 'error');
  }
  const one = await reader.get('knowledge-base', 'notes/0001.md');
  assert.equal(Buffer.from(one.bytes).toString(), 'x');
  assert.equal(one.meta.path, 'notes/0001.md');
  assert.equal(await reader.get('knowledge-base', 'missing.md'), null);
  await assert.rejects(reader.list('other-space'), /unknown space/);
});

test('API failures surface a status, never the upstream text', async () => {
  const broken = new StoreReader(config, async () => new Response(JSON.stringify({ error: { message: 'secret detail' } }), { status: 503 }));
  await assert.rejects(broken.list('knowledge-base'), (error) => error.message === 'store answered 503');
});

test('folders list their direct children', () => {
  const docs = ['notes/a.md', 'notes/sub/b.md', 'notes/sub/deeper/c.md', 'readme.md', 'notesx/z.md'].map((p) => doc(p));
  const notes = childrenOf(docs, 'notes');
  assert.deepEqual(notes.folders, [{ name: 'sub', count: 2 }]);
  assert.deepEqual(notes.files.map((f) => f.path), ['notes/a.md']);
  const root = childrenOf(docs, '');
  assert.deepEqual(root.folders.map((f) => f.name), ['notes', 'notesx']);
  assert.deepEqual(root.files.map((f) => f.path), ['readme.md']);
  assert.equal(childrenOf(docs, 'nothing-here'), null);
});

test('unsafe paths are refused locally', () => {
  assert.equal(safePath(['notes', 'a b.md']), 'notes/a b.md');
  assert.equal(safePath([]), '');
  // Next.js hands over decoded segments; decoding again would break names like these.
  assert.equal(safePath(['100%.md']), '100%.md');
  assert.equal(safePath(['a%20b.md']), 'a%20b.md');
  assert.equal(safePath(['notes/a.md']), 'notes/a.md');
  for (const segments of [['..', 'x'], ['a', '', 'b'], ['a\\b'], ['a\u0000b'], ['.'], ['a/../b'], ['a//b']]) {
    assert.equal(safePath(segments), null, segments.join('|'));
  }
});

test('documents render by media type', () => {
  assert.equal(viewFor('text/markdown', 'a.md'), 'markdown');
  assert.equal(viewFor('application/octet-stream', 'README.markdown'), 'markdown');
  for (const [type, path] of [['text/plain', 'a.txt'], ['application/json', 'a.json'], ['text/csv', 'a.csv'], ['application/x-yaml', 'a.yaml'], ['text/x-python', 'a.py']]) {
    assert.equal(viewFor(type, path), 'text', path);
  }
  for (const type of ['image/png', 'image/jpeg', 'image/gif', 'image/webp']) assert.equal(viewFor(type, 'x'), 'image');
  for (const [type, path] of [['image/svg+xml', 'a.svg'], ['text/html', 'a.html'], ['application/pdf', 'a.pdf'], ['application/zip', 'a.zip']]) {
    assert.equal(viewFor(type, path), 'download', path);
  }
});

test('private responses are no-store and noindex', () => {
  assert.equal(PRIVATE_HEADERS['Cache-Control'], 'private, no-store');
  assert.equal(PRIVATE_HEADERS['X-Robots-Tag'], 'noindex, nofollow');
  assert.equal(RAW_HEADERS['Content-Security-Policy'], 'sandbox');
  assert.equal(RAW_HEADERS['X-Content-Type-Options'], 'nosniff');
});

test('front matter is YAML only: a js engine never runs', () => {
  globalThis.__pwned = false;
  const js = splitFrontMatter('---js\n{ title: (globalThis.__pwned = true, "x") }\n---\nbody');
  assert.equal(globalThis.__pwned, false);
  assert.equal(js.title, null);
  const yaml = splitFrontMatter('---\ntitle: Runbook\n---\n# Body\n');
  assert.deepEqual(yaml, { title: 'Runbook', content: '# Body\n' });
  assert.deepEqual(splitFrontMatter('# No front matter'), { title: null, content: '# No front matter' });
});

test('a malformed YAML front matter is shown as text and never thrown', () => {
  const bad = '---\ntitle: private: value\n---\nbody';
  assert.deepEqual(splitFrontMatter(bad), { title: null, content: bad });
});

test('relative images and links in a document point into the private shelf', () => {
  const html = '<p><img src="./diagram.png" alt="d"> <img src="../img/x%20y.png"> <img src="https://cdn.example/a.png">'
    + ' <a href="other.md#part">o</a> <a href="/abs">a</a> <a href="#top">t</a> <img src="../../../escape.png"> <a href="mailto:x@y.z">m</a></p>';
  const out = rewriteRelative(html, 'knowledge-base', 'notes/sub/readme.md');
  assert.match(out, /src="\/private\/raw\/knowledge-base\/notes\/sub\/diagram.png"/);
  assert.match(out, /src="\/private\/raw\/knowledge-base\/notes\/img\/x%20y.png"/);
  assert.match(out, /src="https:\/\/cdn.example\/a.png"/);
  assert.match(out, /href="\/private\/knowledge-base\/notes\/sub\/other.md#part"/);
  assert.match(out, /href="\/abs"/);
  assert.match(out, /href="#top"/);
  assert.match(out, /href="mailto:x@y.z"/);
  // A path that climbs out of the space is left alone rather than guessed.
  assert.match(out, /src="..\/..\/..\/escape.png"/);
});

test('an unknown signing key refreshes the certificates once', async () => {
  const rotated = generateKeyPairSync('rsa', { modulusLength: 2048 });
  let served = certs;
  let fetches = 0;
  const fetchImpl = async () => { fetches += 1; return new Response(JSON.stringify(served), { status: 200 }); };
  const cache = new Map();
  assert.equal(await verifyAccess(accessToken(), config, { now: NOW, fetchImpl, cache }), 'owner@example.com');
  served = { keys: [{ ...rotated.publicKey.export({ format: 'jwk' }), kid: 'k2', alg: 'RS256' }] };
  const fresh = accessToken({}, { key: rotated.privateKey, kid: 'k2' });
  assert.equal(await verifyAccess(fresh, config, { now: NOW, fetchImpl, cache }), 'owner@example.com');
  assert.equal(fetches, 2);
  // Forced refreshes are spaced 30 s apart: a stream of forged kids makes no further calls.
  for (let i = 0; i < 5; i += 1) {
    assert.equal(await verifyAccess(accessToken({}, { kid: `nope-${i}` }), config, { now: NOW, fetchImpl, cache }), null);
  }
  assert.equal(fetches, 2);
  // A failing forced refresh keeps the cached keys working.
  cache.get('team.cloudflareaccess.com').forcedAt = 0;
  const down = async () => { fetches += 1; return new Response('', { status: 500 }); };
  assert.equal(await verifyAccess(accessToken({}, { kid: 'nope-x' }), config, { now: NOW, fetchImpl: down, cache }), null);
  assert.equal(await verifyAccess(fresh, config, { now: NOW, fetchImpl: down, cache }), 'owner@example.com');
});

test('entities in rendered URLs are decoded before the fragment is split off', () => {
  const out = rewriteRelative('<a href="./a&#x26;b.md#x">l</a> <img src="it&#x27;s.png">', 'kb', 'notes/r.md');
  assert.match(out, /href="\/private\/kb\/notes\/a%26b.md#x"/);
  assert.match(out, /src="\/private\/raw\/kb\/notes\/it's.png"/);
});
