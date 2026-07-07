import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import type { Metadata } from 'next';
import { loadPost, listPosts, relatedPosts } from '@/lib/posts';
import { mdxComponents } from '@/components/mdx';
import { articleJsonLd, faqJsonLd, breadcrumbJsonLd, SITE_URL, SITE_NAME } from '@/lib/structured-data';
import { AdSlot } from '@/components/AdSlot';
import { ADSENSE_SLOT_IN_ARTICLE } from '@/lib/ads';
import { SubscribeForm } from '@/components/SubscribeForm';
import { amazonSearchUrl, isShoppableCategory, AFFILIATE_DISCLOSURE } from '@/lib/affiliate';
import { splitForMidArticleAd } from '@/lib/split-article';

export const revalidate = 300;

export async function generateStaticParams() {
  // Only pre-render published posts; a future-dated (scheduled) post is rendered
  // on demand once its time has passed.
  const posts = await listPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) return { title: 'Not found' };

  const { title, description, hero, date, category, tags } = post.frontmatter;
  const url = `${SITE_URL}/blog/${slug}`;
  const images = hero?.url ? [hero.url] : [];

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title,
      description,
      images,
      publishedTime: new Date(date).toISOString(),
      authors: [SITE_NAME],
      section: category,
      tags,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) notFound();

  // Scheduled posts are not published (even by direct URL) until their date.
  if (new Date(post.frontmatter.date).getTime() > Date.now()) notFound();

  const { frontmatter, body, readingTimeMin } = post;
  const date = new Date(frontmatter.date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const article = articleJsonLd(post);
  const faq = faqJsonLd(post);
  const breadcrumb = breadcrumbJsonLd(post);
  const related = relatedPosts(post, await listPosts());

  return (
    <article className="mx-auto max-w-3xl px-6 py-12 sm:py-20">
      {/* Structured data — escape `<` so post content can't break out of the script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(article).replace(/</g, '\\u003c') }}
      />
      {faq && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faq).replace(/</g, '\\u003c') }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, '\\u003c') }}
      />

      {/* Article header */}
      <header className="mb-12">
        <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted">
          <Link href={`/categories/${frontmatter.category}`} className="border border-accent px-2 py-0.5 text-accent hover:bg-accent hover:text-paper transition-colors">
            {frontmatter.category}
          </Link>
          <span>{date}</span>
          <span>·</span>
          <span>{readingTimeMin} min read</span>
        </div>
        <h1 className="font-display text-4xl sm:text-6xl font-black leading-[1.02] tracking-tight">
          {frontmatter.title}
        </h1>
        <p className="mt-6 font-display text-xl sm:text-2xl font-normal leading-snug text-ink/70">
          {frontmatter.description}
        </p>
      </header>

      {/* Hero */}
      {frontmatter.hero?.url && (
        <figure className="mb-12 -mx-6 sm:mx-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={frontmatter.hero.url}
            alt={frontmatter.hero.alt}
            fetchPriority="high"
            decoding="async"
            className="aspect-video w-full object-cover"
          />
          {frontmatter.hero.credit && (
            <figcaption className="mt-2 px-6 sm:px-0 text-xs text-muted">
              Photo:{' '}
              <a href={frontmatter.hero.creditUrl} className="underline hover:text-accent" target="_blank" rel="noopener noreferrer">
                {frontmatter.hero.credit}
              </a>
            </figcaption>
          )}
        </figure>
      )}

      {/* Body — split at the contract's "How to think about it" boundary so a
          mid-article ad can sit between the halves; falls back to a single
          render when the post can't be split safely (see split-article.ts). */}
      {(() => {
        const halves = splitForMidArticleAd(body);
        return (
          <>
            <div className="prose-editorial">
              <MDXRemote source={halves[0]} components={mdxComponents} />
            </div>
            {halves.length === 2 && (
              <>
                <AdSlot
                  slot={ADSENSE_SLOT_IN_ARTICLE}
                  format="fluid"
                  layout="in-article"
                  className="my-10 block text-center"
                />
                <div className="prose-editorial">
                  <MDXRemote source={halves[1]} components={mdxComponents} />
                </div>
              </>
            )}
          </>
        );
      })()}

      {/* In-article ad after the body (renders only when AdSense is configured) */}
      <AdSlot
        slot={ADSENSE_SLOT_IN_ARTICLE}
        format="fluid"
        layout="in-article"
        className="my-12 block text-center"
      />

      {/* Contextual shop link — only for buyable product categories, so the
          back catalog earns affiliate revenue without per-post curation. */}
      {isShoppableCategory(frontmatter.category) && (
        <aside className="my-12 border border-accent/40 bg-accent/5 p-5">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            Shop this
          </div>
          <div className="font-display text-lg font-semibold leading-snug">
            Looking to buy? Compare prices and current deals on Amazon.
          </div>
          <a
            href={amazonSearchUrl(frontmatter.title)}
            target="_blank"
            rel="noopener noreferrer sponsored nofollow"
            className="mt-3 inline-block border border-accent bg-accent px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-transparent hover:text-accent"
          >
            Search on Amazon →
          </a>
          <p className="mt-3 text-xs leading-relaxed text-ink/55">{AFFILIATE_DISCLOSURE}</p>
        </aside>
      )}

      {/* Sources */}
      {frontmatter.sources?.length > 0 && (
        <section className="mt-16 border-t-2 border-ink pt-8">
          <div className="mb-4 font-display text-sm font-bold uppercase tracking-[0.3em] text-muted">
            Sources
          </div>
          <ol className="space-y-2 text-sm">
            {frontmatter.sources.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-mono text-accent">{String(i + 1).padStart(2, '0')}</span>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-accent break-all">
                  {s.title || s.url}
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* End-of-article newsletter CTA — captures engaged readers at the point
          they've finished a piece, the highest-intent moment to subscribe. */}
      <section className="mt-16 border-2 border-ink bg-ink/[0.03] p-6 sm:p-8">
        <div className="font-display text-2xl font-black leading-tight">
          Stay ahead of the gear curve
        </div>
        <p className="mt-2 max-w-xl text-ink/70">
          Get the week&rsquo;s most important gadget news and reviews in one short email.
          Free, and no spam.
        </p>
        <div className="mt-4">
          <SubscribeForm />
        </div>
      </section>

      {/* Tags */}
      {frontmatter.tags?.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-2">
          {frontmatter.tags.map((t) => (
            <Link key={t} href={`/tags/${t}`} className="border border-ink/30 px-2 py-1 text-[11px] uppercase tracking-widest text-ink/70 hover:border-accent hover:text-accent transition-colors">
              #{t}
            </Link>
          ))}
        </div>
      )}

      {/* Keep reading — internal links to related posts */}
      {related.length > 0 && (
        <section className="mt-16 border-t-2 border-ink pt-8">
          <div className="mb-6 font-display text-sm font-bold uppercase tracking-[0.3em] text-muted">
            Keep reading
          </div>
          <ul className="space-y-6">
            {related.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="group block">
                  <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-muted">
                    <span className="text-accent">{p.frontmatter.category}</span>
                    <span>·</span>
                    <span>{p.readingTimeMin} min read</span>
                  </div>
                  <div className="mt-1 font-display text-xl font-bold leading-snug group-hover:text-accent transition-colors">
                    {p.frontmatter.title}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-ink/70 line-clamp-2">
                    {p.frontmatter.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Back link */}
      <div className="mt-16 border-t border-ink/20 pt-8">
        <Link href="/" className="inline-flex items-center gap-2 font-display font-semibold text-accent hover:gap-3 transition-all">
          ← Back to {SITE_NAME}
        </Link>
      </div>
    </article>
  );
}
