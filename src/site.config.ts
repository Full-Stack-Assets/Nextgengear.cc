export const siteConfig = {
  // ── Branding ──────────────────────────────────────────────────
  name: 'NextGen Gear',
  tagline: 'Gadgets · Reviews · Gear',
  description: 'The latest gadgets and consumer tech — reviewed, ranked, and explained, refreshed every hour.',
  url: 'https://nextgengear.cc', // change to .com if you register it
  footerNote: 'the latest gear every hour, pulled from across the web.',

  // ── Audience & taxonomy ───────────────────────────────────────
  audience: 'gadget enthusiasts and gear shoppers',
  categories: ['news', 'reviews', 'audio', 'mobile', 'wearables', 'smarthome'],
  navCategories: ['reviews', 'audio', 'wearables'],

  // ── Niche sources ─────────────────────────────────────────────
  sources: {
    subreddits: ['gadgets', 'technology', 'apple', 'Android', 'headphones', 'smarthome'],
    rssFeeds: [
      'https://www.engadget.com/rss.xml',
      'https://gizmodo.com/rss',
      'https://www.androidpolice.com/feed/',
      'https://9to5mac.com/feed/',
      'https://www.gsmarena.com/rss-news-reviews.php3',
    ],
    braveQueries: [
      'new smartphone release',
      'gadget review',
      'wireless earbuds launch',
      'smart home device',
      'wearable tech announcement',
    ],
  },

  // ── Ads ───────────────────────────────────────────────────────
  adsenseClient: 'ca-pub-4655488107179825',

  // ── Engine: writer LLM (Google Gemini, OpenAI-compatible) ─────
  llm: {
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-flash-latest',
    apiKeyEnv: 'GEMINI_API_KEY',
  },

  // ── Engine: hero images ('pexels' | 'openverse' | 'none') ─────
  imageProvider: 'pexels',
} as const;

export type SiteConfig = typeof siteConfig;
export type ImageProvider = 'pexels' | 'openverse' | 'none';
