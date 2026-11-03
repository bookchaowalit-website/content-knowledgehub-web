import { NextResponse, type NextRequest } from 'next/server';
import { RAW_HEADERS, readConfig, safePath, StoreReader, verifyAccess, viewFor } from '@/lib/private';

export const dynamic = 'force-dynamic';

const notFound = () => new NextResponse('Not found', { status: 404, headers: { ...RAW_HEADERS, 'Content-Type': 'text/plain' } });

export async function GET(request: NextRequest, { params }: { params: Promise<{ space: string; path: string[] }> }) {
  const config = readConfig();
  if (!config || !(await verifyAccess(request.headers.get('cf-access-jwt-assertion'), config))) return notFound();
  const { space, path: segments } = await params;
  const path = safePath(segments);
  if (!path || !config.spaces.includes(space)) return notFound();
  const doc = await new StoreReader(config).get(space, path);
  if (!doc) return notFound();
  const inline = viewFor(doc.meta.media_type, path) === 'image' && !request.nextUrl.searchParams.has('download');
  // Shown as text or an image, never as a page: HTML and SVG are always downloads.
  const type = inline ? doc.meta.media_type : viewFor(doc.meta.media_type, path) === 'download' ? 'application/octet-stream' : 'text/plain; charset=utf-8';
  const name = (path.split('/').pop() || 'file').replace(/[^\w.-]/g, '_');
  return new NextResponse(Buffer.from(doc.bytes), {
    headers: {
      ...RAW_HEADERS,
      'Content-Type': type,
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${name}"`,
    },
  });
}
