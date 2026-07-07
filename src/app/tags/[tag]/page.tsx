import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { listPosts } from '@/lib/posts';
import { SITE_NAME, SITE_URL } from '@/lib/structured-data';

export const revalidate = 300;

export async function generateStaticParams() {
  const posts = await listPosts();
  const tags = Array.from(new Set(posts.flatMap((p) => p.frontmatter.tags ?? [])));
  return tags.map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const title = `#${decoded} — tagged posts`;
  const description = `Everything ${SITE_NAME} has published about ${decoded}.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/tags/${tag}` },
    openGraph: { type: 'website', title, description, url: `${SITE_URL}/tags/${tag}` },
  };
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const posts = (await listPosts()).filter((p) => p.frontmatter.tags?.includes(decoded));
  if (posts.length === 0) notFound();

  // Sibling categories for cross-navigation from a tag page.
  const categories = Array.from(new Set(posts.map((p) => p.frontmatter.category)));

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-12 border-b-2 border-ink pb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-muted">Tag</div>
        <h1 className="mt-2 font-display text-5xl font-black">#{decoded}</h1>
        <p className="mt-2 text-muted">{posts.length} {posts.length === 1 ? 'post' : 'posts'}</p>
        {categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-widest">
            <span className="text-muted">In:</span>
            {categories.map((c) => (
              <Link key={c} href={`/categories/${c}`} className="text-accent hover:underline">
                {c}
              </Link>
            ))}
          </div>
        )}
      </div>
      <ul className="divide-y divide-ink/20">
        {posts.map((p) => (
          <li key={p.slug} className="py-6">
            <Link href={`/blog/${p.slug}`} className="group block">
              <h2 className="font-display text-2xl font-semibold group-hover:text-accent transition-colors">
                {p.frontmatter.title}
              </h2>
              <p className="mt-1 text-ink/70">{p.frontmatter.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
