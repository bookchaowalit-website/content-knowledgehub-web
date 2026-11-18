import type { Metadata } from 'next';
import { SHELVES, ShelfView } from '@/components/hub-views';
import { getEntries } from '@/lib/mdx';

export const metadata: Metadata = { title: SHELVES.docs.title, description: SHELVES.docs.lede, alternates: { canonical: '/docs' } };

export default function ShelfPage() {
  return <ShelfView shelf="docs" entries={getEntries('docs')} />;
}
