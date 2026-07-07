import Link from 'next/link';
import type { Metadata } from 'next';
import { listPosts } from '@/lib/posts';
import { isShoppableCategory } from '@/lib/affiliate';
import { SITE_NAME, SITE_URL } from '@/lib/structured-data';

export const revalidate = 300;

// Index of the buyer-intent hub pages. Renders gracefully with zero hubs (no
// shoppable-category posts yet) instead of 404ing, so the nav link is always
// safe to show.

/** Human-friendly category label, e.g. "smarthome" → "Smart Home". */
function label(category: string): string {
  const special: Record<string, string> = { smarthome: 'Smart Home' };
  return special[category] ?? category[0].toUpperCase() + category.slice(1);
}

export const metadata: Metadata = {
  title: 'Buying Guides',
  description: `Continuously-updated buying guides from ${SITE_NAME}: the best gear in every category we cover.`,
  alternates: { canonical: `${SITE_URL}/best` },
};

export default async function BestIndexPage() {
  const posts = await listPosts();
  const counts = new Map<string, number>();
  for (const p of posts) {
    const c = p.frontmatter.category;
    if (isShoppableCategory(c)) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const hubs = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const year = new Date().getFullYear();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-10 border-b-2 border-ink pb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-muted">Buying guides</div>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl font-black leading-tight">
          The Best Gear of {year}
        </h1>
        <p className="mt-4 text-lg text-ink/70">
          Continuously-updated guides built from {SITE_NAME}&rsquo;s hourly coverage — what&rsquo;s
          worth buying in every category, right now.
        </p>
      </div>

      {hubs.length === 0 ? (
        <p className="text-muted">
          No guides yet — they appear automatically as product coverage is published.{' '}
          <Link href="/" className="text-accent underline">Browse the latest stories →</Link>
        </p>
      ) : (
        <ul className="divide-y divide-ink/20">
          {hubs.map(([category, count]) => (
            <li key={category} className="py-6">
              <Link href={`/best/${category}`} className="group block">
                <h2 className="font-display text-2xl font-semibold group-hover:text-accent transition-colors">
                  Best {label(category)} in {year} →
                </h2>
                <p className="mt-1 text-sm uppercase tracking-widest text-muted">
                  {count} {count === 1 ? 'article' : 'articles'} of coverage
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
