import type { Metadata } from 'next';
import { McpDocs } from '@/components/mcp-docs';
import { HubFrame, SITE } from '@/components/hub-views';
import { TOOLS } from '@/lib/mcp';

export const metadata: Metadata = { title: 'MCP API', description: "How to call the Knowledge Hub's read-only MCP endpoint.", alternates: { canonical: '/mcp' } };

export default function McpPage() {
  return <HubFrame><McpDocs name="Knowledge Hub" site={SITE} tools={TOOLS} /></HubFrame>;
}
