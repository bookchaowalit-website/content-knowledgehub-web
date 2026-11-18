import type { Metadata } from 'next';
import { SHELVES, ShelfView } from '@/components/hub-views';
import { getEntries } from '@/lib/mdx';

export const metadata: Metadata = { title: SHELVES.ideas.title, description: SHELVES.ideas.lede, alternates: { canonical: '/ideas' } };

export default function ShelfPage() {
  return <ShelfView shelf="ideas" entries={getEntries('ideas')} />;
}
