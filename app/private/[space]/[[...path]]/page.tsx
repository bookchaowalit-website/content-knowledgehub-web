import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Download, FileText, Folder } from 'lucide-react';
import { childrenOf, hrefFor, safePath, splitFrontMatter, viewFor } from '@/lib/private';
import { renderEntry } from '@/lib/render-entry';
import { ownerReader } from '../../owner';

export const dynamic = 'force-dynamic';

function Crumbs({ space, path }: { space: string; path: string }) {
  const parts = path ? path.split('/') : [];
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-600 break-words">
      <Link href="/private" className="hover:text-gray-900 underline-offset-2 hover:underline">Private</Link>
      <span aria-hidden="true"> / </span>
      <Link href={hrefFor('/private', space, '')} className="hover:text-gray-900 underline-offset-2 hover:underline">{space}</Link>
      {parts.map((part, i) => (
        <span key={i}>
          <span aria-hidden="true"> / </span>
          {i === parts.length - 1 ? <span aria-current="page" className="text-gray-900">{part}</span>
            : <Link href={hrefFor('/private', space, parts.slice(0, i + 1).join('/'))} className="hover:text-gray-900 underline-offset-2 hover:underline">{part}</Link>}
        </span>
      ))}
    </nav>
  );
}

const kib = (size: number) => (size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KiB`);

export default async function PrivateEntry({ params }: { params: Promise<{ space: string; path?: string[] }> }) {
  const { space, path: segments = [] } = await params;
  const { reader, spaces } = await ownerReader();
  const path = safePath(segments);
  if (path === null || !spaces.includes(space)) notFound();

  const docs = await reader.list(space);
  const listing = childrenOf(docs, path);
  if (listing) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Crumbs space={space} path={path} />
        <h1 className="text-2xl font-bold text-gray-900 mb-6 break-words">{path || space}</h1>
        <ul className="bg-white rounded-lg shadow-sm divide-y divide-gray-100">
          {listing.folders.map((f) => (
            <li key={'d' + f.name}>
              <Link href={hrefFor('/private', space, path ? `${path}/${f.name}` : f.name)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600">
                <Folder size={18} className="shrink-0 text-green-700" aria-hidden="true" />
                <span className="min-w-0 flex-1 break-words">{f.name}</span>
                <span className="text-sm text-gray-500">{f.count}</span>
              </Link>
            </li>
          ))}
          {listing.files.map((d) => (
            <li key={'f' + d.path}>
              <Link href={hrefFor('/private', space, d.path)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600">
                <FileText size={18} className="shrink-0 text-gray-400" aria-hidden="true" />
                <span className="min-w-0 flex-1 break-words">{d.path.split('/').pop()}</span>
                <span className="text-sm text-gray-500">{kib(d.size)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  const doc = await reader.get(space, path);
  if (!doc) notFound();
  const view = viewFor(doc.meta.media_type, path);
  const raw = hrefFor('/private/raw', space, path);
  const name = path.split('/').pop() || path;
  const text = view === 'markdown' || view === 'text' ? Buffer.from(doc.bytes).toString('utf8') : '';
  const parsed = view === 'markdown' ? splitFrontMatter(text) : null;
  const html = parsed ? await renderEntry(parsed.content) : '';
  const title = parsed?.title || name;

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <Crumbs space={space} path={path} />
      <article className="bg-white rounded-lg shadow-md p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 break-words">{title}</h1>
        <p className="text-sm text-gray-500 mb-6">
          Version {doc.meta.version} · updated {new Date(doc.meta.updated_at).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' })} · {kib(doc.meta.size)} ·{' '}
          <a href={raw} className="underline underline-offset-2 hover:text-gray-900">raw</a>
        </p>
        {view === 'markdown' && <div className="prose prose-lg prose-green max-w-none break-words" dangerouslySetInnerHTML={{ __html: html }} />}
        {view === 'text' && <pre className="overflow-x-auto rounded-md bg-gray-50 p-4 text-sm text-gray-900"><code>{text}</code></pre>}
        {/* eslint-disable-next-line @next/next/no-img-element -- private bytes must not pass through the image optimiser */}
        {view === 'image' && <img src={raw} alt={name} className="max-w-full h-auto" />}
        {view === 'download' && (
          <a href={`${raw}?download=1`} className="inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2 text-white hover:bg-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2">
            <Download size={18} aria-hidden="true" /> Download {name}
          </a>
        )}
      </article>
    </main>
  );
}
