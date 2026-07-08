import type { RawItem } from '../orchestrator/types';
import { fetchJson } from '../http';
import { siteConfig } from '@/site.config';

/**
 * Lobsters (lobste.rs) — a high-signal, invite-only tech-news aggregator with a
 * clean, key-free JSON API. Like Hacker News it's niche-agnostic (general tech),
 * so — matching the engine's "on-niche only" policy — we filter its stories
 * against the site's `trendsKeywords` and only admit ones that match. That keeps
 * this gadgets/consumer-tech site from surfacing, say, a compiler-internals post.
 *
 * Endpoint: https://lobste.rs/hottest.json (the front-page "hottest" ranking).
 */

const LOBSTERS_HOTTEST = 'https://lobste.rs/hottest.json';

const NICHE_KEYWORDS = siteConfig.sources.trendsKeywords;

interface LobstersStory {
  short_id: string;
  title: string;
  url: string;
  score: number;
  comment_count: number;
  created_at: string;
  comments_url: string;
  submitter_user?: string | { username?: string };
  tags?: string[];
  description_plain?: string;
}

export async function fetchLobsters(): Promise<RawItem[]> {
  try {
    const stories = await fetchJson<LobstersStory[]>(LOBSTERS_HOTTEST, {
      headers: { accept: 'application/json', 'user-agent': 'NextGenGearBot/1.0' },
      timeoutMs: 10_000,
    });
    return lobstersToRawItems(stories, NICHE_KEYWORDS);
  } catch (err) {
    console.warn('[lobsters] fetch failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Map raw Lobsters stories to RawItems, dropping anything that doesn't match the
 * site niche. Pure and exported so it can be unit-tested without a network call.
 */
export function lobstersToRawItems(
  stories: LobstersStory[],
  keywords: readonly string[]
): RawItem[] {
  const out: RawItem[] = [];

  for (const s of stories) {
    if (!s || !s.title || !s.url) continue;

    // Niche gate: title + tags must mention a niche keyword (cheap, lowercased).
    const haystack = `${s.title} ${(s.tags ?? []).join(' ')}`.toLowerCase();
    if (!keywords.some((k) => haystack.includes(k.toLowerCase()))) continue;

    out.push({
      id: `lobsters:${s.short_id}`,
      source: 'lobsters',
      title: s.title,
      url: s.url,
      author: submitterName(s.submitter_user),
      publishedAt: normalizeDate(s.created_at),
      summary: s.description_plain?.slice(0, 500) || undefined,
      upvotes: typeof s.score === 'number' ? s.score : 0,
      comments: typeof s.comment_count === 'number' ? s.comment_count : 0,
      tags: s.tags ?? [],
    });
  }

  return out;
}

/** The API has returned `submitter_user` as both a bare string and an object. */
function submitterName(u: LobstersStory['submitter_user']): string | undefined {
  if (!u) return undefined;
  return typeof u === 'string' ? u : u.username;
}

/** Coerce the story timestamp to ISO, falling back to now if unparseable. */
function normalizeDate(raw: string | undefined): string {
  const t = raw ? new Date(raw).getTime() : NaN;
  return Number.isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
}
