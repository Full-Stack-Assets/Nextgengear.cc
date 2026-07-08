import Parser from 'rss-parser';
import type { RawItem } from '../orchestrator/types';
import { fetchWithRetry } from '../http';

const FEED_UA = 'Mozilla/5.0 (compatible; NextGenGearBot/1.0; +https://nextgengear.cc)';

export interface YtEntry {
  id?: string;
  title?: string;
  link?: string;
  author?: string;
  isoDate?: string;
  pubDate?: string;
  'media:group'?: { 'media:description'?: string[] };
}

const parser: Parser<unknown, YtEntry> = new Parser({
  customFields: { item: [['media:group', 'media:group']] },
});

export async function fetchYouTube(): Promise<RawItem[]> {
  const channels = process.env.YOUTUBE_CHANNELS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
  if (channels.length === 0) return [];

  const items: RawItem[] = [];

  for (const channelId of channels) {
    try {
      const entries = await fetchFeed(channelId);
      items.push(...ytFeedToRawItems(entries, channelId));
    } catch (err) {
      console.warn(`[youtube] ${channelId} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return items;
}

/** Fetch + parse a channel's uploads feed through the retrying HTTP helper. */
async function fetchFeed(channelId: string): Promise<YtEntry[]> {
  const res = await fetchWithRetry(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
    { timeoutMs: 10_000, headers: { 'user-agent': FEED_UA } }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status} for channel ${channelId}`);
  const feed = await parser.parseString(await res.text());
  return feed.items as YtEntry[];
}

/**
 * Map a channel's feed entries (first 5) to RawItems. Pure and exported so it
 * can be unit-tested without a network call.
 */
export function ytFeedToRawItems(entries: YtEntry[], channelId: string): RawItem[] {
  const out: RawItem[] = [];
  for (const entry of entries.slice(0, 5)) {
    if (!entry.link || !entry.title) continue;
    const videoId = entry.link.split('v=')[1]?.split('&')[0] ?? entry.id ?? entry.link;
    const desc = entry['media:group']?.['media:description']?.[0];
    out.push({
      id: `youtube:${videoId}`,
      source: 'youtube',
      title: entry.title,
      url: entry.link,
      author: entry.author ?? channelId,
      publishedAt: entry.isoDate ?? entry.pubDate ?? new Date().toISOString(),
      summary: desc?.slice(0, 500),
      tags: ['video'],
    });
  }
  return out;
}
