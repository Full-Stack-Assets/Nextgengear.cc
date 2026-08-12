import type { RawItem } from './types';

const strongSignals = [
  'smartphone', 'iphone', 'android', 'pixel', 'galaxy', 'laptop', 'macbook',
  'chromebook', 'tablet', 'ipad', 'graphics card', 'gpu', 'cpu', 'processor',
  'headphones', 'earbuds', 'airpods', 'smartwatch', 'wearable', 'fitness tracker',
  'smart home', 'router', 'monitor', 'ssd', 'consumer electronics', 'usb-c',
  'charger', 'gadget', 'hardware', 'software', 'open source', 'developer tool', 'western digital',
  'ide', 'operating system', 'firmware', 'cybersecurity', 'artificial intelligence',
];

const supportingSignals = [
  'tech', 'device', 'wireless', 'display', 'battery', 'chip', 'intel', 'amd',
  'nvidia', 'snapdragon', 'samsung', 'apple', 'google', 'sony', 'lenovo', 'dell',
  'asus', 'microsoft', 'western digital', 'launch', 'review', 'benchmark',
];

const offNicheSignals = [
  'nfl', 'nba', 'mlb', 'nhl', 'soccer', 'football', 'baseball', 'braves',
  'championship', 'fantasy betting', 'odds', 'weather', 'heat advisory',
  'giveaway', 'power book', 'episode recap', 'celebrity', 'neymar',
];

function containsTerm(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
}

function searchable(item: RawItem): string {
  return [item.title, item.summary, ...(item.tags || [])].filter(Boolean).join(' ').toLowerCase();
}

/** Fail closed before scoring: popularity cannot turn a general-interest item into a gear story. */
export function isRelevantGearItem(item: RawItem): boolean {
  const text = searchable(item);
  const hasStrongSignal = strongSignals.some((term) => containsTerm(text, term));
  const supportingCount = supportingSignals.filter((term) => containsTerm(text, term)).length;
  const hasOffNicheSignal = offNicheSignals.some((term) => containsTerm(text, term));

  if (hasOffNicheSignal && !hasStrongSignal) return false;
  return hasStrongSignal || supportingCount >= 2;
}

export function filterRelevantGearItems(items: RawItem[]): RawItem[] {
  return items.filter(isRelevantGearItem);
}

export function isRelevantGearPost(frontmatter: { title?: string; description?: string; tags?: string[] }): boolean {
  return isRelevantGearItem({
    id: frontmatter.title || 'post',
    source: 'rss',
    title: frontmatter.title || '',
    summary: frontmatter.description || '',
    tags: frontmatter.tags || [],
    url: '',
    publishedAt: '',
  });
}
