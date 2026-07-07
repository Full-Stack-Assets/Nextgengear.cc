import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { listPosts } from '@/lib/posts';
import { isShoppableCategory } from '@/lib/affiliate';
import { SITE_NAME, SITE_URL, itemListJsonLd } from '@/lib/structured-data';

export const revalidate = 300;

// Buyer-intent hub pages: "best <category>" is one of the highest-converting
// query shapes for a gear site, and it's the natural landing page for affiliate
// traffic. Each hub aggregates the freshest coverage in a category into one
// continuously-updated guide, with internal links out to the individual posts
// and the full archive.

/** Human-friendly category label, e.g. "smarthome" → "Smart Home". */
function label(category: string): string {
  const special: Record<string, string> = { smarthome: 'Smart Home' };
  return special[category] ?? category[0].toUpperCase() + category.slice(1);
}

export async function generateStaticParams() {
  const posts = await listPosts();
  const cats = Array.from(new Set(posts.map((p) => p.frontmatter.category)));
  // Only build hubs for buyable product categories — "best news" isn't a
  // buyer-intent query, and these pages are the affiliate landing pages.
  return cats.filter(isShoppableCategory).map((category) => ({ category }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const year = new Date().getFullYear();
  const name = label(category);
  const title = `Best ${name} in ${year}: Latest Reviews & Buying Guide`;
  const description = `The latest ${name.toLowerCase()} coverage, reviews, and buying advice from ${SITE_NAME}, refreshed continuously.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/best/${category}` },
    openGraph: { type: 'website', title, description, url: `${SITE_URL}/best/${category}` },
  };
}

export default async function BestCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!isShoppableCategory(category)) notFound();

  const posts = (await listPosts()).filter((p) => p.frontmatter.category === category);
  if (posts.length === 0) notFound();

  const name = label(category);
  const year = new Date().getFullYear();
  const featured = posts.slice(0, 12);
  const itemList = itemListJsonLd(`Best ${name} in ${year}`, featured);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      {/* Structured data — escape `<` so titles can't break out of the script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList).replace(/</g, '\\u003c') }}
      />
      <div className="mb-10 border-b-2 border-ink pb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-muted">Buying guide</div>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl font-black leading-tight">
          The Best {name} in {year}
        </h1>
        <p className="mt-4 text-lg text-ink/70">
          A continuously-updated guide to the latest {name.toLowerCase()} news, reviews, and
          releases — pulled together from {SITE_NAME}&rsquo;s hourly coverage so you can see what
          matters right now before you buy.
        </p>
      </div>

      <ol className="space-y-8">
        {featured.map((p, i) => (
          <li key={p.slug} className="flex gap-4">
            <span className="font-display text-2xl font-black text-accent/40 leading-none pt-1">
              {String(i + 1).padStart(2, '0')}
            </span>
            <Link href={`/blog/${p.slug}`} className="group block flex-1">
              <h2 className="font-display text-xl sm:text-2xl font-semibold leading-snug group-hover:text-accent transition-colors">
                {p.frontmatter.title}
              </h2>
              <p className="mt-1 text-ink/70 line-clamp-2">{p.frontmatter.description}</p>
              <div className="mt-2 text-xs uppercase tracking-widest text-muted">
                {new Date(p.frontmatter.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' · '}{p.readingTimeMin} min read
              </div>
            </Link>
          </li>
        ))}
      </ol>

      <div className="mt-12 border-t border-ink/20 pt-8 text-sm">
        <Link href={`/categories/${category}`} className="font-display font-semibold text-accent hover:underline">
          Browse all {name.toLowerCase()} coverage →
        </Link>
      </div>
    </div>
  );
}
