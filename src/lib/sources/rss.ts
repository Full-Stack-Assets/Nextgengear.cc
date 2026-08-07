import Parser from 'rss-parser';
import type { RawItem } from '../orchestrator/types';
import { fetchWithRetry } from '../http';
import { siteConfig } from '@/site.config';

const DEFAULT_FEEDS = siteConfig.sources.rssFeeds;
const FEED_UA = 'Mozilla/5.0 (compatible; NextGenGearBot/1.0; +https://nextgengear.cc)';

const parser = new Parser();

/** The subset of a parsed feed item the mapper needs. */
export interface RssEntry {
  link?: string;
  title?: string;
  creator?: string;
  isoDate?: string;
  pubDate?: string;
  contentSnippet?: string;
  content?: string;
  guid?: string;
  categories?: string[];
}

export async function fetchRss(): Promise<RawItem[]> {
  const extra = process.env.EXTRA_FEEDS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
  const feeds = [...DEFAULT_FEEDS, ...extra];

  const results = await Promise.allSettled(feeds.map(fetchFeed));

  const items: RawItem[] = [];
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const { title, items: entries } = result.value;
    items.push(...rssFeedToRawItems(title, entries));
  }
  return items;
}

/**
 * Fetch a feed through the shared HTTP helper (timeout + retry/backoff — which
 * `rss-parser`'s own `parseURL` lacks) and parse the returned XML.
 */
async function fetchFeed(url: string): Promise<{ title?: string; items: RssEntry[] }> {
  const res = await fetchWithRetry(url, {
    timeoutMs: 10_000,
    headers: { 'user-agent': FEED_UA, accept: 'application/rss+xml, application/xml, text/xml' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const feed = await parser.parseString(await res.text());
  return { title: feed.title, items: feed.items as RssEntry[] };
}

/**
 * Map parsed feed entries (first 10) to RawItems. Pure and exported so it can be
 * unit-tested without a network call.
 */
export function rssFeedToRawItems(feedTitle: string | undefined, entries: RssEntry[]): RawItem[] {
  const out: RawItem[] = [];
  for (const entry of entries.slice(0, 10)) {
    if (!entry.link || !entry.title) continue;
    out.push({
      id: `rss:${entry.guid ?? entry.link}`,
      source: 'rss',
      title: entry.title,
      url: entry.link,
      author: entry.creator ?? feedTitle,
      publishedAt: entry.isoDate ?? entry.pubDate ?? new Date().toISOString(),
      summary: (entry.contentSnippet ?? entry.content ?? '').slice(0, 500),
      tags: entry.categories ?? [],
    });
  }
  return out;
}
