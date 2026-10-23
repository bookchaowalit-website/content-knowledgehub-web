import { NextRequest, NextResponse } from 'next/server';
import { getAllEntries, getEntries, getEntryBySlug, searchEntries } from '@/lib/mdx';
import { handleMcpRequest } from '@/lib/mcp';

const content = { getAllEntries, getEntries, getEntryBySlug, searchEntries };

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid request' } }, { status: 400 });
  }
  const response = await handleMcpRequest(body, content);
  return NextResponse.json(response.body, { status: response.status });
}
