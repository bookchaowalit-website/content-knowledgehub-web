import type { Metadata } from 'next';
import { SHELVES, ShelfView } from '@/components/hub-views';
import { getEntries } from '@/lib/mdx';

export const metadata: Metadata = { title: SHELVES.knowledge.title, description: SHELVES.knowledge.lede, alternates: { canonical: '/knowledge' } };

export default function ShelfPage() {
  return <ShelfView shelf="knowledge" entries={getEntries('knowledge')} />;
}
