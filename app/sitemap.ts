import type { MetadataRoute } from 'next';
import { SHELVES, SITE, type Shelf } from '@/components/hub-views';
import { getEntries } from '@/lib/mdx';

export default function sitemap(): MetadataRoute.Sitemap {
  const shelves = Object.keys(SHELVES) as Shelf[];
  return [
    { url: `${SITE}/` },
    ...shelves.map((shelf) => ({ url: `${SITE}/${shelf}` })),
    ...shelves.flatMap((shelf) => getEntries(shelf).map((entry) => ({ url: `${SITE}/${shelf}/${entry.slug}`, lastModified: entry.frontmatter.date }))),
  ];
}
