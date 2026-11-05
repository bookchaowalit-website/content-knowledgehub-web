import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scrubEvent, sentryOptions } from '../lib/sentry.ts';

test('Sentry stays disabled when no DSN is configured', () => {
  assert.equal(sentryOptions(undefined).enabled, false);
  assert.equal(sentryOptions('').enabled, false);
});

test('Sentry reports errors only: no PII, tracing, trace headers or breadcrumbs', () => {
  const options = sentryOptions('https://key@o0.ingest.sentry.io/1');
  assert.equal(options.enabled, true);
  assert.equal(options.sendDefaultPii, false);
  assert.equal(options.tracesSampleRate, undefined);
  assert.deepEqual(options.tracePropagationTargets, []);
  assert.equal(options.maxBreadcrumbs, 0);
  assert.equal(options.beforeSendTransaction(), null);
  assert.equal(options.beforeSend, scrubEvent);
});

test('scrubEvent drops request data, user, breadcrumbs and extra context', () => {
  const event = scrubEvent({
    message: 'boom',
    request: { url: 'https://example.com/search?q=private', headers: { cookie: 'a=b' } },
    user: { ip_address: '1.2.3.4', email: 'x@example.com' },
    breadcrumbs: [{ message: 'clicked' }],
    extra: { body: 'secret' },
  });
  assert.equal(event.message, 'boom');
  for (const key of ['request', 'user', 'breadcrumbs', 'extra']) assert.equal(event[key], undefined, key);
});

test('scrubEvent removes local variables from stack frames', () => {
  const event = scrubEvent({
    exception: { values: [{ type: 'Error', stacktrace: { frames: [{ function: 'f', vars: { password: 'p' } }] } }] },
  });
  const frame = event.exception.values[0].stacktrace.frames[0];
  assert.equal(frame.function, 'f');
  assert.equal(frame.vars, undefined);
});

test('scrubEvent drops the request path captureRequestError adds and strips query strings', () => {
  const event = scrubEvent({
    transaction: 'GET /search?q=private&token=secret',
    tags: { url: 'https://example.com/search?q=private', route: '/search?q=private' },
    contexts: {
      nextjs: { request_path: '/search?q=private', router_kind: 'App Router', route_type: 'render' },
      trace: { trace_id: 't' },
      runtime: { name: 'node' },
    },
  });
  assert.equal(event.transaction, 'GET /search');
  assert.deepEqual(event.tags, { route: '/search' });
  assert.deepEqual(event.contexts, { runtime: { name: 'node' } });
  assert.doesNotMatch(JSON.stringify(event), /private/);
});

test('scrubEvent strips query strings from URLs in the exception message, frames and debug images', () => {
  const event = scrubEvent({
    exception: {
      values: [{
        value: 'Failed to fetch https://example.com/api?token=secret (from /page?q=private#frag)',
        stacktrace: { frames: [{ filename: 'https://example.com/app.js?v=private', abs_path: '/page?q=private' }] },
      }],
    },
    debug_meta: { images: [{ code_file: 'https://example.com/chunk.js?private=1' }] },
  });
  const value = event.exception.values[0];
  assert.equal(value.value, 'Failed to fetch https://example.com/api (from /page)');
  assert.deepEqual(value.stacktrace.frames[0], { filename: 'https://example.com/app.js', abs_path: '/page' });
  assert.equal(event.debug_meta.images[0].code_file, 'https://example.com/chunk.js');
  assert.doesNotMatch(JSON.stringify(event), /private|secret/);
});

test('strips queries from the top-level message, logentry and fingerprint of a thrown string', () => {
  // The SDK copies a thrown string into event.message and exception.values[0].value.
  const event = scrubEvent({
    message: 'Failed https://example.com/api?token=secret',
    logentry: { message: 'Failed %s', params: ['https://example.com/api?token=secret', 3] },
    fingerprint: ['{{ default }}', '/page?q=private'],
    exception: { values: [{ type: 'Error at /x?private=1', value: 'Failed https://example.com/api?token=secret' }] },
  });
  assert.equal(event.message, 'Failed https://example.com/api');
  assert.deepEqual(event.logentry, { message: 'Failed %s', params: ['https://example.com/api', 3] });
  assert.deepEqual(event.fingerprint, ['{{ default }}', '/page']);
  assert.equal(event.exception?.values?.[0]?.type, 'Error at /x');
  assert.ok(!JSON.stringify(event).includes('secret') && !JSON.stringify(event).includes('private'));
});

test('strips a query glued to a bare word with no scheme or leading slash', () => {
  const event = scrubEvent({ message: 'call api?token=secret&x=1 failed; are you sure? see item #5' });
  assert.equal(event.message, 'call api failed; are you sure? see item #5');
});

test('strips quoted, parenthesised, punctuation-only and leading queries up to the next space', () => {
  const event = scrubEvent({ message: '?key=secret at start; fetch("?token=secret") failed: api?token=(secret) and x?q=a\'secret\' (see /p?x=secret). Ref #access_token=secret ok' });
  const glued = scrubEvent({ message: 'Failed https://example.com/api?token=(secret)' });
  const punctuation = scrubEvent({ message: '/search?q=!!! and /api?password=secret!!! and /search#!!! and (/x?y=secret))' });
  assert.equal(event.message, ' at start; fetch(") failed: api and x (see /p Ref  ok');
  assert.equal(glued.message, 'Failed https://example.com/api');
  assert.equal(punctuation.message, '/search and /api and /search and (/x)');
  assert.ok(!/secret|!/.test(JSON.stringify([event, glued, punctuation])));
});

test('private shelf paths never reach Sentry', () => {
  const event = scrubEvent({
    message: 'failed at /private/knowledge-base/roles/plan.md',
    transaction: '/private/architecture-docs/runbooks/db.md',
    tags: { route: '/private/knowledge-base/notes', release: 'r1' },
    exception: { values: [{ value: 'fetch https://knowledgehub.bookchaowalit.com/private/raw/kb/a%20b.png?download=1 failed' }] },
  });
  const text = JSON.stringify(event);
  assert.doesNotMatch(text, /knowledge-base|architecture-docs|plan\.md|a%20b/);
  assert.equal(event.transaction, '/private/[redacted]');
  assert.equal(event.tags.route, '/private/[redacted]');
  assert.equal(event.tags.release, 'r1');
  assert.equal(event.exception.values[0].value, '/private/[redacted]');
  // Names with spaces, quotes or brackets, and page URLs in stack frames, are covered too.
  const odd = scrubEvent({
    message: "open /private/kb/My (draft) 'plan'.md failed",
    exception: { values: [{ stacktrace: { frames: [
      { abs_path: 'https://knowledgehub.bookchaowalit.com/private/kb/My note.md', filename: '/private/kb/x.md' },
      { abs_path: 'https://knowledgehub.bookchaowalit.com/_next/static/chunks/app/private/[space]/page.js' },
    ] } }] },
    debug_meta: { images: [{ code_file: 'https://knowledgehub.bookchaowalit.com/private/kb/a.md' }] },
  });
  assert.doesNotMatch(JSON.stringify(odd), /draft|plan|My note|x\.md|a\.md/);
  assert.match(odd.exception.values[0].stacktrace.frames[1].abs_path, /_next\/static/);
  for (const path of ['https://k.example/private/kb/s.md?x=/_next/', 'https://k.example/private/kb/_next/static/s.md', '/private/kb/s.md#/_next/static/']) {
    const frame = scrubEvent({ exception: { values: [{ stacktrace: { frames: [{ abs_path: path }] } }] } }).exception.values[0].stacktrace.frames[0];
    assert.equal(frame.abs_path, '/private/[redacted]', path);
  }
  // Public paths are left alone.
  assert.equal(scrubEvent({ transaction: '/knowledge/privateer' }).transaction, '/knowledge/privateer');
});
