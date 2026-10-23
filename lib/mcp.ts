// JSON-RPC (MCP-style) handler for the public content API at /api/mcp.
// The content functions are passed in so the handler can be tested without Next.js.

export const CATEGORIES = ['diary', 'knowledge', 'docs', 'ideas'] as const;

type Entry = { slug: string; frontmatter: object; content: string };

export type ContentSource = {
  getEntries: (category?: string) => Entry[];
  getAllEntries: () => Entry[];
  getEntryBySlug: (category: string, slug: string) => Entry | null;
  searchEntries: (query: string) => Promise<Entry[]>;
};

export type McpResponse = { status: number; body: Record<string, unknown> };

type RpcRequest = { id?: number | string | null; method?: unknown; params?: { name?: unknown; arguments?: Record<string, unknown> } };

class RpcError extends Error {
  readonly code: number;
  readonly status: number;
  constructor(code: number, message: string, status = 200) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const TOOLS = [
  {
    name: 'get_entries',
    description: 'Get all entries or filter by category',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: CATEGORIES, description: 'Filter by category' },
        limit: { type: 'number', description: 'Limit number of results' },
      },
    },
  },
  {
    name: 'get_entry_by_slug',
    description: 'Get a specific entry by slug and category',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: CATEGORIES, description: 'Entry category' },
        slug: { type: 'string', description: 'Entry slug' },
      },
      required: ['category', 'slug'],
    },
  },
  {
    name: 'search_entries',
    description: 'Search all entries by title, content, or tags',
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Search query' } }, required: ['query'] },
  },
  { name: 'get_categories', description: 'Get all available categories', inputSchema: { type: 'object', properties: {} } },
];

const withoutBody = (entries: Entry[]) => entries.map(({ slug, frontmatter }) => ({ slug, frontmatter }));

function category(value: unknown): string {
  if (typeof value !== 'string' || !(CATEGORIES as readonly string[]).includes(value)) {
    throw new RpcError(-32602, `category must be one of ${CATEGORIES.join(', ')}`, 400);
  }
  return value;
}

function text(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new RpcError(-32602, `${name} is required`, 400);
  return value;
}

async function callTool(content: ContentSource, name: unknown, args: Record<string, unknown> = {}): Promise<unknown> {
  switch (name) {
    case 'get_entries': {
      let entries = args.category === undefined ? content.getAllEntries() : content.getEntries(category(args.category));
      if (typeof args.limit === 'number' && args.limit > 0) entries = entries.slice(0, args.limit);
      return withoutBody(entries);
    }
    case 'get_entry_by_slug': {
      const slug = text(args.slug, 'slug');
      if (!/^[a-z0-9-]+$/.test(slug)) throw new RpcError(-32602, 'slug may only contain a-z, 0-9 and -', 400);
      return content.getEntryBySlug(category(args.category), slug);
    }
    case 'search_entries':
      return withoutBody(await content.searchEntries(text(args.query, 'query')));
    case 'get_categories':
      return [...CATEGORIES];
    default:
      throw new RpcError(-32601, `Unknown tool: ${String(name)}`);
  }
}

export async function handleMcpRequest(request: RpcRequest, content: ContentSource): Promise<McpResponse> {
  const id = request.id ?? null;
  try {
    let result: unknown;
    switch (request.method) {
      case 'initialize':
        result = {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {}, resources: {} },
          serverInfo: {
            name: 'Knowledge Hub API',
            version: '1.0.0',
            description: 'Personal documentation, diary, knowledge base, and ideas',
          },
        };
        break;
      case 'tools/list':
        result = { tools: TOOLS };
        break;
      case 'tools/call':
        result = await callTool(content, request.params?.name, request.params?.arguments);
        break;
      default:
        throw new RpcError(-32601, `Unknown method: ${String(request.method)}`);
    }
    return { status: 200, body: { jsonrpc: '2.0', id, result } };
  } catch (error) {
    if (error instanceof RpcError) {
      return { status: error.status, body: { jsonrpc: '2.0', id, error: { code: error.code, message: error.message } } };
    }
    // Unexpected failure: no internals in the response.
    return { status: 500, body: { jsonrpc: '2.0', id, error: { code: -32603, message: 'Internal error' } } };
  }
}
