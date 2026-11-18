import type { Metadata } from 'next';
import { SHELVES, ShelfView } from '@/components/hub-views';
import { getEntries } from '@/lib/mdx';

export const metadata: Metadata = { title: SHELVES.diary.title, description: SHELVES.diary.lede, alternates: { canonical: '/diary' } };

export default function ShelfPage() {
  return <ShelfView shelf="diary" entries={getEntries('diary')} />;
}
