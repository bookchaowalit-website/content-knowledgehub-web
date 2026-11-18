import { Prose, ReaderHead, TableScroll } from "@/components/reader-shell";

// How to call this site's read-only MCP endpoint. The endpoint answers POST only, so the footer links here
// rather than to /api/mcp itself (a browser GET would get 405).

export type McpTool = { name: string; description: string; inputSchema: { properties?: Record<string, unknown>; required?: string[] } };

const call = (site: string, body: object) => `curl -s ${site}/api/mcp \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify(body)}'`;

const args = (tool: McpTool) => {
  const names = Object.keys(tool.inputSchema.properties ?? {});
  if (names.length === 0) return "none";
  return names.map((name) => `${name}${tool.inputSchema.required?.includes(name) ? "" : " (optional)"}`).join(", ");
};

export function McpDocs({ name, site, tools }: { name: string; site: string; tools: McpTool[] }) {
  const example = tools[0];
  return (
    <>
      <ReaderHead
        eyebrow="For developers and AI agents"
        title="MCP API"
        lede={`${name} answers Model Context Protocol (JSON-RPC 2.0) requests at /api/mcp. It is read-only, needs no key, and returns the same content this site shows.`}
      />
      <Prose>
        <h2>Call it</h2>
        <p>Send a <code>POST</code> with a JSON-RPC body. A plain browser visit (<code>GET</code>) is not supported.</p>
        <pre tabIndex={0}><code>{call(site, { jsonrpc: "2.0", id: 1, method: "tools/list" })}</code></pre>
        {example ? (
          <>
            <p>Then call a tool by name with its arguments:</p>
            <pre tabIndex={0}><code>{call(site, { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: example.name, arguments: {} } })}</code></pre>
          </>
        ) : null}
        <h2>Tools</h2>
        <TableScroll label="MCP tools">
          <table>
            <thead><tr><th scope="col">Tool</th><th scope="col">What it returns</th><th scope="col">Arguments</th></tr></thead>
            <tbody>
              {tools.map((tool) => (
                <tr key={tool.name}><td><code style={{ whiteSpace: "nowrap" }}>{tool.name}</code></td><td>{tool.description}</td><td>{args(tool)}</td></tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
        <p>The methods <code>initialize</code>, <code>tools/list</code> and <code>tools/call</code> are supported; anything else returns a JSON-RPC error.</p>
      </Prose>
    </>
  );
}
