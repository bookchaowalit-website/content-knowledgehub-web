import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EntryView, SITE } from '@/components/hub-views';
import { getEntries, getEntryBySlug } from '@/lib/mdx';
import { renderArticle } from '@/lib/render-entry';

type Search = { q?: string | string[]; shelf?: string | string[] };
type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<Search> };
const first = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value) ?? '';

export function generateStaticParams() {
  return getEntries('diary').map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const entry = getEntryBySlug('diary', (await params).slug);
  if (!entry) return {};
  const { title, description } = entry.frontmatter;
  // Each entry shares as itself (layout.tsx sets the home page's Open Graph data).
  return {
    title,
    description,
    alternates: { canonical: `/diary/${entry.slug}` },
    openGraph: { type: 'article', url: `${SITE}/diary/${entry.slug}`, title, description, siteName: 'Knowledge Hub' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function EntryPage({ params, searchParams }: Props) {
  const entry = getEntryBySlug('diary', (await params).slug);
  const search = (await searchParams) ?? {};
  if (!entry) notFound();
  return <EntryView shelf="diary" entry={entry} html={await renderArticle(entry.content)} siblings={getEntries('diary')} q={first(search.q).slice(0, 200)} from={first(search.shelf)} />;
}
