import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { listPosts } from '@/lib/posts';
import { isShoppableCategory } from '@/lib/affiliate';
import { SITE_NAME, SITE_URL } from '@/lib/structured-data';
import { AdSlot } from '@/components/AdSlot';
import { ADSENSE_SLOT_LISTING } from '@/lib/ads';

export const revalidate = 300;

export async function generateStaticParams() {
  const posts = await listPosts();
  const cats = Array.from(new Set(posts.map((p) => p.frontmatter.category)));
  return cats.map((category) => ({ category }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const label = category[0].toUpperCase() + category.slice(1);
  const title = `${label} — latest coverage`;
  const description = `The latest ${category} stories from ${SITE_NAME}, refreshed continuously.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/categories/${category}` },
    openGraph: { type: 'website', title, description, url: `${SITE_URL}/categories/${category}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const posts = (await listPosts()).filter((p) => p.frontmatter.category === category);
  if (posts.length === 0) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-12 border-b-2 border-ink pb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-muted">Category</div>
        <h1 className="mt-2 font-display text-5xl font-black capitalize">{category}</h1>
        <p className="mt-2 text-muted">{posts.length} {posts.length === 1 ? 'post' : 'posts'}</p>
      </div>

      {/* Cross-link to the buyer-intent hub — the affiliate landing page for
          this category. Only shown for buyable product categories. */}
      {isShoppableCategory(category) && (
        <div className="mb-10 border border-accent/40 bg-accent/5 p-5">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            Buying guide
          </div>
          <Link href={`/best/${category}`} className="font-display text-lg font-semibold leading-snug hover:text-accent transition-colors">
            The best {category === 'smarthome' ? 'smart home' : category} gear right now →
          </Link>
        </div>
      )}

      <ul className="divide-y divide-ink/20">
        {posts.map((p, i) => (
          <li key={p.slug} className="py-6">
            <Link href={`/blog/${p.slug}`} className="group block">
              <h2 className="font-display text-2xl font-semibold group-hover:text-accent transition-colors">
                {p.frontmatter.title}
              </h2>
              <p className="mt-1 text-ink/70">{p.frontmatter.description}</p>
              <div className="mt-2 text-xs uppercase tracking-widest text-muted">
                {new Date(p.frontmatter.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' · '}{p.readingTimeMin} min
              </div>
            </Link>
            {/* One listing ad after the 4th entry (renders only when configured). */}
            {i === 3 && posts.length > 5 && (
              <AdSlot slot={ADSENSE_SLOT_LISTING} format="auto" className="mt-6 block" />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
