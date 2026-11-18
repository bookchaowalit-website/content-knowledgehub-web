import type { MetadataRoute } from 'next';
import { SITE } from '@/components/hub-views';

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/private', '/api/'] }], sitemap: `${SITE}/sitemap.xml` };
}
