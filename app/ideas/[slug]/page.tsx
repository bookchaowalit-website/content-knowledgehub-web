import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EntryView, SITE } from '@/components/hub-views';
import { getEntries, getEntryBySlug } from '@/lib/mdx';
import { renderArticle } from '@/lib/render-entry';

type Search = { q?: string | string[]; shelf?: string | string[] };
type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<Search> };
const first = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value) ?? '';

export function generateStaticParams() {
  return getEntries('ideas').map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const entry = getEntryBySlug('ideas', (await params).slug);
  if (!entry) return {};
  const { title, description } = entry.frontmatter;
  // Each entry shares as itself (layout.tsx sets the home page's Open Graph data).
  return {
    title,
    description,
    alternates: { canonical: `/ideas/${entry.slug}` },
    openGraph: { type: 'article', url: `${SITE}/ideas/${entry.slug}`, title, description, siteName: 'Knowledge Hub' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function EntryPage({ params, searchParams }: Props) {
  const entry = getEntryBySlug('ideas', (await params).slug);
  const search = (await searchParams) ?? {};
  if (!entry) notFound();
  return <EntryView shelf="ideas" entry={entry} html={await renderArticle(entry.content)} siblings={getEntries('ideas')} q={first(search.q).slice(0, 200)} from={first(search.shelf)} />;
}
