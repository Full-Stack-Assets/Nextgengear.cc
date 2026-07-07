import type { MetadataRoute } from 'next';
// SITE_URL derives from siteConfig with an empty-string-safe
// NEXT_PUBLIC_SITE_URL override — never hardcode a site URL here.
import { SITE_URL } from '@/lib/structured-data';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
