// The private shelf (SPEC-002): owner-only pages read live from the hosted knowledge store.
// Two gates: Cloudflare Access at the edge, and the Access JWT checked again here, so a
// *.vercel.app URL that skips Cloudflare still finds nothing. No path, body or email is logged.

import { createPublicKey, createSign, createVerify, randomUUID } from 'node:crypto';

export type PrivateConfig = {
  team: string;
  aud: string;
  emails: Set<string>;
  spaces: string[];
  api: string;
  issuer: string;
  subject: string;
  key: string;
};

export type DocumentMeta = {
  path: string;
  sha256: string;
  size: number;
  media_type: string;
  visibility: string;
  version: number;
  updated_at: string;
};

type Env = Record<string, string | undefined>;
type FetchImpl = (url: string, init: RequestInit) => Promise<Response>;

export const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
} as const;

export const RAW_HEADERS = {
  ...PRIVATE_HEADERS,
  'Content-Security-Policy': 'sandbox',
  'X-Content-Type-Options': 'nosniff',
} as const;

const SPACE_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;
const HOST_RE = /^[a-z0-9.-]+\.cloudflareaccess\.com$/;

function httpsOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return null;
    return value.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

/** The private shelf's settings, or null when any of them is missing or malformed. */
export function readConfig(env: Env = process.env): PrivateConfig | null {
  const get = (name: string) => (env[name] || '').trim();
  const team = get('KNOWLEDGE_HUB_ACCESS_TEAM').toLowerCase();
  const aud = get('KNOWLEDGE_HUB_ACCESS_AUD');
  const emails = new Set(get('KNOWLEDGE_HUB_OWNER_EMAILS').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean));
  const spaces = get('KNOWLEDGE_HUB_PRIVATE_SPACES').split(',').map((s) => s.trim()).filter(Boolean);
  const api = httpsOrigin(get('EMPIRE_KNOWLEDGE_API'));
  const issuer = httpsOrigin(get('KNOWLEDGE_HUB_TOKEN_ISSUER'));
  const subject = get('KNOWLEDGE_HUB_OWNER_SUBJECT');
  const key = get('KNOWLEDGE_HUB_SERVICE_KEY').replace(/\\n/g, '\n');
  if (!HOST_RE.test(team) || !aud || !emails.size || !spaces.length || !spaces.every((s) => SPACE_RE.test(s))) return null;
  if (!api || !issuer || !subject || !key.includes('PRIVATE KEY')) return null;
  return { team, aud, emails, spaces, api, issuer, subject, key };
}

import type { JsonWebKey as NodeJwk } from 'node:crypto';

type Jwk = NodeJwk & { kid?: string };
const certCache = new Map<string, { keys: Jwk[]; at: number }>();
const CERT_TTL_MS = 10 * 60 * 1000;

async function accessCerts(team: string, fetchImpl: FetchImpl | undefined): Promise<Jwk[]> {
  const cached = !fetchImpl && certCache.get(team);
  if (cached && Date.now() - cached.at < CERT_TTL_MS) return cached.keys;
  const response = await (fetchImpl || fetch)(`https://${team}/cdn-cgi/access/certs`, { cache: 'no-store', redirect: 'error' });
  if (!response.ok) throw new Error(`access certs answered ${response.status}`);
  const keys = ((await response.json()) as { keys?: Jwk[] }).keys || [];
  if (!fetchImpl) certCache.set(team, { keys, at: Date.now() });
  return keys;
}

const decodePart = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

/** The owner's email when the Access JWT is valid for this app, else null. Never throws. */
export async function verifyAccess(
  token: string | null | undefined,
  config: PrivateConfig,
  options: { now?: number; fetchImpl?: FetchImpl } = {},
): Promise<string | null> {
  try {
    if (!token || token.length > 8192) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const header = decodePart(parts[0]);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return null;
    const jwk = (await accessCerts(config.team, options.fetchImpl)).find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const verifier = createVerify('RSA-SHA256').update(`${parts[0]}.${parts[1]}`);
    if (!verifier.verify(createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(parts[2], 'base64url'))) return null;
    const claims = decodePart(parts[1]);
    const now = options.now ?? Math.floor(Date.now() / 1000);
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (claims.iss !== `https://${config.team}` || !audiences.includes(config.aud)) return null;
    if (typeof claims.exp !== 'number' || claims.exp <= now) return null;
    if (typeof claims.nbf === 'number' && claims.nbf > now + 5) return null;
    const email = typeof claims.email === 'string' ? claims.email.toLowerCase() : '';
    return email && config.emails.has(email) ? email : null;
  } catch {
    return null;
  }
}

const encodePart = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** A 60-second knowledge:read token for the knowledge API, signed with this app's own key. */
export function mintReadToken(config: PrivateConfig, now = Math.floor(Date.now() / 1000)): string {
  const head = `${encodePart({ alg: 'RS256', typ: 'JWT' })}.${encodePart({
    iss: config.issuer,
    aud: 'knowledge-api',
    sub: config.subject,
    tenant_id: 'owner',
    scope: 'knowledge:read',
    iat: now,
    nbf: now,
    exp: now + 60,
    jti: randomUUID(),
  })}`;
  return `${head}.${createSign('RSA-SHA256').update(head).sign(config.key).toString('base64url')}`;
}

/** Joined store path from URL segments, or null if any segment is unsafe. '' is the space root. */
export function safePath(segments: string[]): string | null {
  try {
    const parts = segments.flatMap((s) => decodeURIComponent(s).split('/'));
    if (segments.length && parts.some((p) => !p || p === '.' || p === '..' || /[\\\u0000]/.test(p))) return null;
    return parts.join('/');
  } catch {
    return null;
  }
}

const PAGE = 1000;

export class StoreReader {
  private config: PrivateConfig;
  private fetchImpl: FetchImpl;

  constructor(config: PrivateConfig, fetchImpl: FetchImpl = fetch) {
    this.config = config;
    this.fetchImpl = fetchImpl;
  }

  private async call(route: string, query: Record<string, string>): Promise<Response> {
    const url = `${this.config.api}/api/v1/store/${route}?${new URLSearchParams(query)}`;
    const response = await this.fetchImpl(url, {
      headers: { Authorization: `Bearer ${mintReadToken(this.config)}`, Accept: 'application/json' },
      cache: 'no-store',
      redirect: 'error',
    });
    return response;
  }

  private checkSpace(space: string) {
    if (!this.config.spaces.includes(space)) throw new Error('unknown space');
  }

  /** Every live document's metadata in a space, in path order. */
  async list(space: string): Promise<DocumentMeta[]> {
    this.checkSpace(space);
    const all: DocumentMeta[] = [];
    for (let offset = 0; ; offset += PAGE) {
      const response = await this.call('documents', { space, limit: String(PAGE), offset: String(offset) });
      if (!response.ok) throw new Error(`store answered ${response.status}`);
      const page = (await response.json()) as { documents: DocumentMeta[]; total: number };
      all.push(...page.documents);
      if (!page.documents.length || all.length >= page.total) return all;
    }
  }

  /** One document's bytes and metadata, or null when it does not exist. */
  async get(space: string, path: string): Promise<{ meta: DocumentMeta; bytes: Uint8Array } | null> {
    this.checkSpace(space);
    const response = await this.call('document', { space, path });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`store answered ${response.status}`);
    const { document } = (await response.json()) as {
      document: DocumentMeta & { encoding: string; content?: string; content_base64?: string };
    };
    const { encoding, content, content_base64, ...meta } = document;
    const bytes = encoding === 'utf-8' ? Buffer.from(content || '', 'utf8') : Buffer.from(content_base64 || '', 'base64');
    return { meta, bytes };
  }
}

/** Direct sub-folders (with document counts) and files under a folder, or null if it is empty. */
export function childrenOf(docs: DocumentMeta[], folder: string) {
  const prefix = folder ? `${folder}/` : '';
  const folders = new Map<string, number>();
  const files: DocumentMeta[] = [];
  for (const doc of docs) {
    if (!doc.path.startsWith(prefix)) continue;
    const rest = doc.path.slice(prefix.length);
    const slash = rest.indexOf('/');
    if (slash === -1) files.push(doc);
    else folders.set(rest.slice(0, slash), (folders.get(rest.slice(0, slash)) || 0) + 1);
  }
  if (!files.length && !folders.size) return null;
  return {
    folders: [...folders].sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => ({ name, count })),
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
  };
}

const TEXT_EXT = /\.(txt|json|jsonl|csv|tsv|ya?ml|toml|ini|cfg|conf|py|ts|tsx|js|mjs|cjs|sh|sql|xml|log|env\.example|gitignore|dockerfile|rst)$/i;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

/** How a document is shown: rendered Markdown, a text block, an inline image or a download. */
export function viewFor(mediaType: string, path: string): 'markdown' | 'text' | 'image' | 'download' {
  if (mediaType === 'text/markdown' || /\.(md|markdown|mdx)$/i.test(path)) return 'markdown';
  if (IMAGE_TYPES.has(mediaType)) return 'image';
  if (mediaType === 'text/html' || mediaType === 'image/svg+xml') return 'download';
  if (mediaType.startsWith('text/') || /json|yaml|xml|toml/.test(mediaType) || TEXT_EXT.test(path)) return 'text';
  return 'download';
}

/** URL path for a store document, each segment encoded. */
export function hrefFor(base: string, space: string, path: string): string {
  return [base, encodeURIComponent(space), ...path.split('/').filter(Boolean).map(encodeURIComponent)].join('/');
}
