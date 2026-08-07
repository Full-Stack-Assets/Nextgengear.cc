import type { RawItem } from '../orchestrator/types';
import { fetchJson } from '../http';
import { siteConfig } from '@/site.config';

interface BraveNewsResult {
  url: string;
  title: string;
  description: string;
  age: string;
  page_age?: string;
  meta_url?: { hostname?: string };
}

const BRAVE_QUERIES = siteConfig.sources.braveQueries;

export async function fetchBraveNews(): Promise<RawItem[]> {
  const key = process.env.BRAVE_API_KEY;
  if (!key) {
    console.warn('[brave] BRAVE_API_KEY not set — skipping');
    return [];
  }

  const items: RawItem[] = [];

  for (const q of BRAVE_QUERIES) {
    try {
      const url = new URL('https://api.search.brave.com/res/v1/news/search');
      url.searchParams.set('q', q);
      url.searchParams.set('count', '10');
      url.searchParams.set('freshness', 'pd'); // past day

      const json = await fetchJson<{ results?: BraveNewsResult[] }>(url, {
        headers: { 'x-subscription-token': key, accept: 'application/json' },
        timeoutMs: 10_000,
      });
      items.push(...braveResultsToRawItems(json.results ?? [], q));
    } catch (err) {
      console.warn(`[brave] "${q}" failed:`, err instanceof Error ? err.message : err);
    }
  }
  return items;
}

/**
 * Map Brave news results to RawItems for a given query. Pure and exported so it
 * can be unit-tested without a network call.
 */
export function braveResultsToRawItems(results: BraveNewsResult[], query: string): RawItem[] {
  return results.map<RawItem>((r) => ({
    id: `brave:${Buffer.from(r.url).toString('base64url').slice(0, 32)}`,
    source: 'bravenews',
    title: r.title,
    url: r.url,
    author: r.meta_url?.hostname,
    publishedAt: parseRelativeAge(r.page_age ?? r.age),
    summary: r.description,
    tags: [query],
  }));
}

/**
 * Brave returns `page_age` / `age` as relative strings like "2 hours ago",
 * "3 days ago", "January 15, 2025". Try to parse to ISO; fall back to now.
 */
export function parseRelativeAge(age: string | undefined): string {
  if (!age) return new Date().toISOString();

  // Try as an absolute date first ("January 15, 2025")
  const abs = new Date(age);
  if (!isNaN(abs.getTime()) && abs.getFullYear() > 2000) {
    return abs.toISOString();
  }

  // Parse relative: "N hours/minutes/days ago"
  const match = age.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/i);
  if (match) {
    const n = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const multipliers: Record<string, number> = {
      second: 1000,
      minute: 60_000,
      hour: 3_600_000,
      day: 86_400_000,
      week: 604_800_000,
      month: 2_592_000_000,
      year: 31_536_000_000,
    };
    return new Date(Date.now() - n * (multipliers[unit] ?? 0)).toISOString();
  }

  return new Date().toISOString();
}
