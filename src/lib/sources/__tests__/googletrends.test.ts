import { describe, it, expect } from 'vitest';
import { toRawItems, parseTraffic } from '../googletrends';

function trend(title: string, news: Array<Record<string, unknown>> = [], traffic?: string) {
  return {
    title,
    isoDate: '2026-06-01T00:00:00.000Z',
    'ht:approx_traffic': traffic,
    'ht:news_item': news,
  };
}

describe('toRawItems (google trends niche filter)', () => {
  it('keeps a trend whose term matches a tech keyword', () => {
    const out = toRawItems([trend('New iPhone rumor')]);
    expect(out).toHaveLength(1);
    expect(out[0].source).toBe('googletrends');
  });

  it('drops an off-niche trend', () => {
    expect(toRawItems([trend('Local football scores')])).toHaveLength(0);
  });

  it('matches a keyword found only in a related news headline', () => {
    const out = toRawItems([
      trend('Some Person', [{ 'ht:news_item_title': 'Nvidia GPU launch', 'ht:news_item_source': 'TechSite' }]),
    ]);
    expect(out).toHaveLength(1);
  });

  it('prefers a related news headline + URL for the item', () => {
    const [item] = toRawItems([
      trend('Apple event', [
        { 'ht:news_item_title': 'Apple unveils new Mac', 'ht:news_item_url': 'https://news.test/mac' },
      ]),
    ]);
    expect(item.title).toBe('Apple unveils new Mac');
    expect(item.url).toBe('https://news.test/mac');
  });

  it('falls back to a Google search URL when no news URL is present', () => {
    const [item] = toRawItems([trend('Nvidia')]);
    expect(item.url).toContain('https://www.google.com/search?q=');
  });
});

describe('parseTraffic', () => {
  it('parses plain, K, M, and B suffixes', () => {
    expect(parseTraffic('200,000+')).toBe(200_000);
    expect(parseTraffic('50K+')).toBe(50_000);
    expect(parseTraffic('2M+')).toBe(2_000_000);
    expect(parseTraffic('1.5B')).toBe(1_500_000_000);
  });

  it('returns 0 for missing or unparseable input', () => {
    expect(parseTraffic(undefined)).toBe(0);
    expect(parseTraffic('lots')).toBe(0);
  });
});
