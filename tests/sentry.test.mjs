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
