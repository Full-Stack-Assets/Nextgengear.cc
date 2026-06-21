/**
 * THE one file to edit when cloning this repo into a new niche site.
 *
 * Everything site-specific lives here: branding, the audience/voice, the
 * categories, the sources the hourly pipeline pulls from, and the AdSense id.
 * Change these values (plus the per-site secrets and a Vercel project/domain)
 * and you have a new auto-blog running the same engine. See CREATE-A-SITE.md.
 *
 * URLs and the AdSense id can also be overridden per-deploy via env vars
 * (NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_ADSENSE_CLIENT) without editing this file.
 */
export const siteConfig = {
  // ── Branding ──────────────────────────────────────────────────
  name: 'Wire and Logic',
  tagline: 'Hourly · Synthesized · Opinionated',
  description: 'An hourly trend brief for builders, synthesized from across the web.',
  url: 'https://wireandlogic.com', // production URL, no trailing slash
  footerNote: "a new post every hour, generated from what's trending.",

  // ── Audience & taxonomy ───────────────────────────────────────
  // One phrase describing who the site writes for; injected into the prompt.
  audience: 'a developer and builder audience',
  // Allowed post categories.
  categories: ['news', 'tools', 'engineering', 'ai', 'security', 'opinion'],
  // Subset shown in the header nav.
  navCategories: ['engineering', 'ai', 'tools'],

  // ── Niche sources (what the pipeline pulls from) ──────────────
  sources: {
    subreddits: ['programming', 'webdev', 'technology', 'devops', 'javascript', 'MachineLearning'],
    rssFeeds: [
      'https://feeds.arstechnica.com/arstechnica/technology-lab',
      'https://www.theverge.com/rss/index.xml',
      'https://techcrunch.com/feed/',
      'https://github.blog/feed/',
      'https://stackoverflow.blog/feed/',
    ],
    braveQueries: [
      'new programming language release',
      'developer tools launch',
      'AI framework release',
      'open source project',
      'software security vulnerability',
    ],
  },

  // ── Ads (optional) ────────────────────────────────────────────
  // AdSense publisher id (ca-pub-...). Leave '' to keep the site ad-free.
  adsenseClient: 'ca-pub-4655488107179825',

  // ── Engine: the writer LLM (any OpenAI-compatible chat endpoint) ──
  // Swap providers by changing these three lines. `apiKeyEnv` names the env var
  // holding the key, so different sites can use different providers/quotas.
  llm: {
    // Google Gemini free tier (~1,500 requests/day), OpenAI-compatible endpoint.
    // The key (set as the GEMINI_API_KEY secret) is sent as a Bearer token.
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-flash-latest',
    apiKeyEnv: 'GEMINI_API_KEY',
    // Groq (fast, free; 12K tokens/min):
    //   endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    //   model: 'llama-3.3-70b-versatile',  apiKeyEnv: 'GROQ_API_KEY'
    // OpenRouter (one key, many free models):
    //   endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    //   model: 'meta-llama/llama-3.3-70b-instruct:free',  apiKeyEnv: 'OPENROUTER_API_KEY'
  },

  // ── Engine: hero images ───────────────────────────────────────
  // 'pexels' (needs PEXELS_API_KEY), 'openverse' (keyless), or 'none'.
  imageProvider: 'pexels',
} as const;

export type SiteConfig = typeof siteConfig;
export type ImageProvider = 'pexels' | 'openverse' | 'none';
