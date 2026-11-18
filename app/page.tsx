import { HomeView } from '@/components/hub-views';
import { getEntries } from '@/lib/mdx';

type Search = { q?: string | string[]; shelf?: string | string[] };
const first = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value) ?? '';

export default async function HomePage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  return <HomeView entries={getEntries()} q={first(params.q).slice(0, 200)} shelf={first(params.shelf)} />;
}
