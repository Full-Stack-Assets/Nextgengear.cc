import { listPosts } from '@/lib/posts';
import { SITE_URL } from '@/lib/structured-data';
import { isShoppableCategory } from '@/lib/affiliate';
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = SITE_URL;
  const posts = await listPosts();

  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${siteUrl}/blog/${p.slug}`,
    lastModified: new Date(p.frontmatter.date),
    changeFrequency: 'never',
    priority: 0.8,
  }));

  const categories = Array.from(new Set(posts.map((p) => p.frontmatter.category)));
  const catEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${siteUrl}/categories/${c}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.5,
  }));

  // Buyer-intent hub pages — only for buyable product categories that have
  // posts — plus the /best index that links them together.
  const hubEntries: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/best`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.6 },
    ...categories.filter(isShoppableCategory).map((c) => ({
      url: `${siteUrl}/best/${c}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
  ];

  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${siteUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${siteUrl}/stats`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.3 },
    ...postEntries,
    ...catEntries,
    ...hubEntries,
  ];
}
