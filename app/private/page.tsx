import Link from 'next/link';
import { ArrowLeft, FolderLock, FileText } from 'lucide-react';
import { hrefFor } from '@/lib/private';
import { ownerReader } from './owner';

export const dynamic = 'force-dynamic';

export default async function PrivateIndex({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { reader, spaces } = await ownerReader();
  const q = ((await searchParams).q || '').trim().toLowerCase().slice(0, 200);
  const listed = await Promise.all(spaces.map(async (space) => ({ space, docs: await reader.list(space) })));
  const hits = q
    ? listed.flatMap(({ space, docs }) => docs.filter((d) => d.path.toLowerCase().includes(q)).map((d) => ({ space, doc: d }))).slice(0, 200)
    : [];

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8">
        <ArrowLeft size={20} aria-hidden="true" />
        <span>Back to Home</span>
      </Link>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Private shelf</h1>
      <p className="text-gray-600 mb-6">Owner-only. Read live from the hosted knowledge store; edit through the knowledge MCP.</p>

      <form method="get" className="mb-8 flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">Find a document by path</label>
        <input id="q" name="q" defaultValue={q} placeholder="Find by path, e.g. runbook"
          className="flex-1 min-w-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600" />
        <button type="submit" className="rounded-md bg-green-700 px-4 py-2 text-white hover:bg-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2">Find</button>
      </form>

      {q ? (
        <section aria-labelledby="results">
          <h2 id="results" className="text-xl font-semibold text-gray-900 mb-4">{hits.length} matching {hits.length === 1 ? 'document' : 'documents'}{hits.length === 200 ? ' (first 200)' : ''}</h2>
          <ul className="bg-white rounded-lg shadow-sm divide-y divide-gray-100">
            {hits.map(({ space, doc }) => (
              <li key={space + doc.path}>
                <Link href={hrefFor('/private', space, doc.path)} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600">
                  <FileText size={18} className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
                  <span className="min-w-0 break-words"><span className="text-gray-500">{space}/</span>{doc.path}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {listed.map(({ space, docs }) => (
            <li key={space}>
              <Link href={hrefFor('/private', space, '')} className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600">
                <FolderLock className="text-green-700 mb-3" size={24} aria-hidden="true" />
                <span className="block text-lg font-semibold text-gray-900">{space}</span>
                <span className="text-sm text-gray-600">{docs.length} documents</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
