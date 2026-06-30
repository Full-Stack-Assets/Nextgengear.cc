import Link from 'next/link';
import { siteConfig } from '@/site.config';
import { AFFILIATE_ENABLED, AFFILIATE_DISCLOSURE } from '@/lib/affiliate';

export const metadata = { title: 'About' };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-10 border-b-2 border-ink pb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-muted">About</div>
        <h1 className="mt-2 font-display text-5xl font-black">How this works</h1>
      </div>

      <div className="prose-editorial">
        <p>
          <strong>{siteConfig.name}</strong> is an experiment in what happens when you point a small,
          opinionated pipeline at the firehose of consumer-tech news and let it write a fresh post every hour.
        </p>

        <h2>The pipeline</h2>
        <p>At the top of every hour, a scheduled function does five things:</p>
        <ol>
          <li><strong>Gather.</strong> Pulls headlines from Reddit, Hacker News, DEV.to, a curated set of gadget/tech RSS feeds, YouTube, Brave News, and Google Trends.</li>
          <li><strong>Score.</strong> Each candidate gets a composite score — popularity, engagement, recency — and anything that&rsquo;s already been covered is filtered out.</li>
          <li><strong>Research.</strong> The winner gets Brave-searched, the top articles scraped, and any relevant YouTube transcripts pulled.</li>
          <li><strong>Write.</strong> All of it is handed to an LLM with an explicit MDX contract: an opening, a takeaway, what-happened/why-it-matters sections, a pros/cons block, a how-to-think-about-it section, and a three-question FAQ.</li>
          <li><strong>Publish.</strong> The MDX file, with a banner image and frontmatter, is committed to GitHub and the site auto-deploys.</li>
        </ol>

        <h2>Editorial standards</h2>
        <p>
          Articles here are researched and drafted with AI and published under human editorial
          oversight. A human operator curates the publication, is accountable for what appears, and
          reviews and corrects content. Automated writing has a quality floor, not a ceiling — the
          pipeline will occasionally pick a boring topic, miss nuance, or get a detail subtly wrong.
          Every post links every source at the bottom; if something doesn&rsquo;t add up, go read the
          primaries. Spotted a mistake? Corrections are welcome.
        </p>

        <h2>How we make money</h2>
        <p>
          {siteConfig.name} is free to read. We may run display advertising, and some product links
          are affiliate links{AFFILIATE_ENABLED ? '' : ' (when enabled)'}: if you buy through them we
          may earn a commission, at no extra cost to you. {AFFILIATE_ENABLED ? AFFILIATE_DISCLOSURE : ''} Affiliate
          relationships never determine which products we cover or what we say about them.
        </p>

        <p className="mt-8">
          <Link href="/" className="text-accent underline">← Back to the front page</Link>
        </p>
      </div>
    </div>
  );
}
