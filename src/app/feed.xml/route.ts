import { listPosts } from '@/lib/posts';
// SITE_URL/SITE_NAME/SITE_DESCRIPTION derive from siteConfig with an
// empty-string-safe NEXT_PUBLIC_SITE_URL override — never hardcode branding here.
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from '@/lib/structured-data';

export const revalidate = 300;

/** Escape text used outside CDATA (attribute values, element text). */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET() {
  const posts = await listPosts();
  const siteUrl = SITE_URL;

  const items = posts
    .slice(0, 20)
    .map((p) => {
      const hero = p.frontmatter.hero?.url
        ? `\n      <media:content url="${xmlEscape(p.frontmatter.hero.url)}" medium="image"/>`
        : '';
      return `
    <item>
      <title><![CDATA[${p.frontmatter.title}]]></title>
      <link>${siteUrl}/blog/${p.slug}</link>
      <guid isPermaLink="true">${siteUrl}/blog/${p.slug}</guid>
      <pubDate>${new Date(p.frontmatter.date).toUTCString()}</pubDate>
      <description><![CDATA[${p.frontmatter.description}]]></description>
      <category>${xmlEscape(p.frontmatter.category)}</category>${hero}
    </item>`;
    })
    .join('');

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title><![CDATA[${SITE_NAME}]]></title>
    <link>${siteUrl}</link>
    <description><![CDATA[${SITE_DESCRIPTION}]]></description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(feed.trim(), {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}
