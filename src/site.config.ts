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
    // Broadened to target consumer electronics and computers/devices news:
    // phones, laptops & PCs, components (CPU/GPU), tablets, wearables, audio,
    // and smart-home gear.
    subreddits: [
      'gadgets',
      'technology',
      'apple',
      'Android',
      'headphones',
      'smarthome',
      'hardware',
      'buildapc',
      'laptops',
      'electronics',
      'wearables',
      'tablets',
      'mac',
      'computers',
    ],
    rssFeeds: [
      'https://www.engadget.com/rss.xml',
      'https://gizmodo.com/rss',
      'https://www.androidpolice.com/feed/',
      'https://9to5mac.com/feed/',
      'https://www.gsmarena.com/rss-news-reviews.php3',
      'https://www.theverge.com/rss/index.xml',
      'https://www.tomshardware.com/feeds/all',
      'https://www.cnet.com/rss/news/',
      'https://www.techradar.com/rss',
      'https://arstechnica.com/gadgets/feed/',
      'https://www.digitaltrends.com/feed/',
      'https://www.pcworld.com/index.rss',
    ],
    braveQueries: [
      'new smartphone release',
      'gadget review',
      'wireless earbuds launch',
      'smart home device',
      'wearable tech announcement',
      'new laptop release',
      'consumer electronics news',
      'PC hardware launch',
      'graphics card release',
      'new processor announcement',
      'tablet release',
      'smartwatch launch',
      'tech product launch',
    ],
    // Google Trends' "Trending now" feed is general-interest; only surface a
    // trend whose term or related headlines match one of these niche keywords.
    // Cheap, lowercased substring match (see googletrends.ts).
    trendsKeywords: [
      'gadget', 'gadgets', 'smartphone', 'phone', 'iphone', 'android', 'pixel', 'galaxy',
      'laptop', 'macbook', 'pc', 'desktop', 'computer', 'chromebook', 'tablet', 'ipad',
      'cpu', 'gpu', 'graphics card', 'processor', 'chip', 'intel', 'amd', 'nvidia', 'snapdragon', 'apple silicon',
      'headphones', 'earbuds', 'airpods', 'speaker', 'soundbar', 'smartwatch', 'wearable', 'fitness tracker',
      'smart home', 'router', 'monitor', 'ssd', 'consumer electronics', 'wireless', 'usb-c', 'charger',
      'samsung', 'apple', 'google', 'sony', 'lenovo', 'dell', 'asus', 'microsoft', 'ces', 'gadget review',
    ],
  },

  // ── Ads ───────────────────────────────────────────────────────
  adsenseClient: 'ca-pub-4655488107179825',

  // ── Affiliate ─────────────────────────────────────────────────
  // Amazon Associates store/tracking id (a public value). Override per-deploy
  // with NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG. Leave blank to render product links
  // without commission attribution. See src/lib/affiliate.ts.
  affiliate: {
    amazonTag: '',
  },

  // ── Engine: writer LLM (Groq, OpenAI-compatible) ──────────────
  llm: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'openai/gpt-oss-120b',
    apiKeyEnv: 'GROQ_API_KEY',
  },

  // Automatic failover: if the primary Groq model is rate-limited, errors, or
  // rejects a request as over its 8K tokens-per-minute free-tier budget (413
  // "request too large"), generate.ts retries against this model on the same
  // key. Llama-4 Scout has a 30K TPM free-tier cap, so failover has real
  // headroom instead of hitting the same 8K ceiling as gpt-oss.
  llmFallback: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    apiKeyEnv: 'GROQ_API_KEY',
  },

  // ── Engine: hero images ('pexels' | 'openverse' | 'none') ─────
  imageProvider: 'pexels',
} as const;

export type SiteConfig = typeof siteConfig;
export type ImageProvider = 'pexels' | 'openverse' | 'none';
