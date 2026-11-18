import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EntryView } from '@/components/hub-views';
import { getEntries, getEntryBySlug } from '@/lib/mdx';
import { renderArticle } from '@/lib/render-entry';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getEntries('diary').map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const entry = getEntryBySlug('diary', (await params).slug);
  if (!entry) return {};
  return { title: entry.frontmatter.title, description: entry.frontmatter.description, alternates: { canonical: `/diary/${entry.slug}` } };
}

export default async function EntryPage({ params }: Props) {
  const entry = getEntryBySlug('diary', (await params).slug);
  if (!entry) notFound();
  return <EntryView shelf="diary" entry={entry} html={await renderArticle(entry.content)} siblings={getEntries('diary')} />;
}
