import Link from 'next/link';
import { listPosts } from '@/lib/posts';
import { siteConfig } from '@/site.config';

export const revalidate = 300; // re-check content every 5 minutes

export default async function HomePage() {
  const posts = await listPosts();
  const [lead, ...rest] = posts;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:py-16">
      <Masthead />

      {posts.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {lead && <LeadStory post={lead} />}
          {rest.length > 0 && (
            <div className="mt-20">
              <SectionRule label="More dispatches" />
              <div className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((p) => (
                  <PostCard key={p.slug} post={p} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Masthead() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const [firstWord, ...restWords] = siteConfig.tagline.split(' · ');
  return (
    <div className="mb-16 border-b border-rule pb-10">
      <div className="flex items-center justify-between gap-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          Updated hourly
        </div>
        <div className="hidden sm:block text-xs uppercase tracking-widest text-muted">{today}</div>
      </div>
      <h1 className="mt-6 max-w-3xl font-display text-5xl sm:text-6xl font-bold leading-[1.02] tracking-tight">
        {firstWord}.{' '}
        <span className="text-gradient">{restWords.join('. ')}{restWords.length > 0 ? '.' : ''}</span>
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
        {siteConfig.description}
      </p>
    </div>
  );
}

function SectionRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="font-display text-xs font-bold uppercase tracking-[0.3em] text-accent">{label}</span>
      <div className="h-px flex-1 rule-gradient" />
    </div>
  );
}

function LeadStory({ post }: { post: Awaited<ReturnType<typeof listPosts>>[number] }) {
  const { slug, frontmatter, readingTimeMin } = post;
  return (
    <article className="card-prism group grid gap-0 overflow-hidden rounded-2xl shadow-card sm:grid-cols-5">
      {frontmatter.hero?.url && (
        <div className="sm:col-span-3 aspect-[4/3] overflow-hidden bg-surface">
          <Link href={`/blog/${slug}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={frontmatter.hero.url}
              alt={frontmatter.hero.alt}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          </Link>
        </div>
      )}
      <div className="sm:col-span-2 flex flex-col justify-center p-7 sm:p-9">
        <Link href={`/categories/${frontmatter.category}`} className="mb-4 inline-block self-start rounded-full bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent-deep transition-colors hover:bg-accent hover:text-white">
          {frontmatter.category}
        </Link>
        <Link href={`/blog/${slug}`}>
          <h2 className="font-display text-3xl sm:text-4xl font-bold leading-[1.08] tracking-tight transition-colors group-hover:text-accent">
            {frontmatter.title}
          </h2>
        </Link>
        <p className="mt-4 text-base leading-relaxed text-muted">{frontmatter.description}</p>
        <div className="mt-5 text-xs font-medium uppercase tracking-widest text-muted">
          {new Date(frontmatter.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {' · '} {readingTimeMin} min read
        </div>
      </div>
    </article>
  );
}

function PostCard({ post }: { post: Awaited<ReturnType<typeof listPosts>>[number] }) {
  const { slug, frontmatter, readingTimeMin } = post;
  return (
    <article className="card-prism group flex flex-col overflow-hidden rounded-xl shadow-card hover:-translate-y-0.5">
      {frontmatter.hero?.url && (
        <Link href={`/blog/${slug}`} className="block aspect-[16/10] overflow-hidden bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={frontmatter.hero.url}
            alt={frontmatter.hero.alt}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-accent-deep">
          {frontmatter.category}
        </div>
        <Link href={`/blog/${slug}`}>
          <h3 className="font-display text-xl font-semibold leading-snug tracking-tight transition-colors group-hover:text-accent">
            {frontmatter.title}
          </h3>
        </Link>
        <p className="mt-2 text-sm leading-relaxed text-muted line-clamp-2">{frontmatter.description}</p>
        <div className="mt-auto pt-4 text-[11px] font-medium uppercase tracking-widest text-muted">
          {new Date(frontmatter.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {' · '} {readingTimeMin} min
        </div>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-rule bg-surface/50 py-24 text-center">
      <div className="font-display text-3xl font-bold">Nothing published yet.</div>
      <p className="mt-3 text-muted">
        Run <code className="rounded-md bg-white px-2 py-0.5 text-sm border border-rule">npm run generate</code> or wait for the next cron tick.
      </p>
    </div>
  );
}
