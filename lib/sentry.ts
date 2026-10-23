// Sentry settings shared by the browser, Node.js and Edge runtimes.
// Errors only: no tracing, no trace headers on outgoing requests, no replay,
// and nothing that can carry user input (URLs, query strings, headers, cookies, bodies, locals).

type Frame = { vars?: unknown };
type ScrubbableEvent = {
  request?: unknown;
  user?: unknown;
  breadcrumbs?: unknown;
  extra?: unknown;
  transaction?: string;
  tags?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  exception?: { values?: { stacktrace?: { frames?: Frame[] } }[] };
};

// Contexts that describe the platform only. Everything else (for example `nextjs`, which
// onRequestError fills with request_path, or `trace`/`response`) is dropped.
const SAFE_CONTEXTS = ["os", "runtime", "browser", "device", "app"];

const stripQuery = (value: string) => value.split(/[?#]/)[0];

export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  delete event.request;
  delete event.user;
  delete event.breadcrumbs;
  delete event.extra;
  if (event.contexts) {
    const kept: Record<string, unknown> = {};
    for (const key of SAFE_CONTEXTS) if (key in event.contexts) kept[key] = event.contexts[key];
    event.contexts = kept;
  }
  if (typeof event.transaction === "string") event.transaction = stripQuery(event.transaction);
  if (event.tags) {
    delete event.tags.url;
    for (const [key, value] of Object.entries(event.tags)) {
      if (typeof value === "string") event.tags[key] = stripQuery(value);
    }
  }
  for (const value of event.exception?.values ?? []) {
    for (const frame of value.stacktrace?.frames ?? []) delete frame.vars;
  }
  return event;
}

export function sentryOptions(dsn: string | undefined) {
  return {
    dsn,
    enabled: Boolean(dsn),
    sendDefaultPii: false,
    tracesSampleRate: undefined,
    tracePropagationTargets: [] as string[],
    maxBreadcrumbs: 0,
    beforeSend: scrubEvent,
    beforeSendTransaction: () => null,
  };
}
