import { describe, it, expect } from 'vitest';
import { rssFeedToRawItems, type RssEntry } from '../rss';

function entry(overrides: Partial<RssEntry> = {}): RssEntry {
  return {
    link: 'https://example.com/a',
    title: 'A gadget review',
    creator: 'Jane',
    isoDate: '2026-06-01T00:00:00.000Z',
    contentSnippet: 'A short snippet.',
    guid: 'guid-1',
    categories: ['reviews'],
    ...overrides,
  };
}

describe('rssFeedToRawItems', () => {
  it('maps an entry to a RawItem with the rss source', () => {
    const [item] = rssFeedToRawItems('Engadget', [entry()]);
    expect(item).toMatchObject({
      id: 'rss:guid-1',
      source: 'rss',
      title: 'A gadget review',
      url: 'https://example.com/a',
      author: 'Jane',
      summary: 'A short snippet.',
      tags: ['reviews'],
    });
  });

  it('falls back to the link when there is no guid', () => {
    const [item] = rssFeedToRawItems('Feed', [entry({ guid: undefined, link: 'https://x.test/p' })]);
    expect(item.id).toBe('rss:https://x.test/p');
  });

  it('uses the feed title as author when the entry has no creator', () => {
    const [item] = rssFeedToRawItems('The Verge', [entry({ creator: undefined })]);
    expect(item.author).toBe('The Verge');
  });

  it('skips entries missing a link or title', () => {
    const out = rssFeedToRawItems('Feed', [
      entry({ link: undefined }),
      entry({ title: undefined }),
      entry({ guid: 'ok' }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('rss:ok');
  });

  it('caps output at 10 entries', () => {
    const many = Array.from({ length: 15 }, (_, i) => entry({ guid: `g${i}`, link: `https://x.test/${i}` }));
    expect(rssFeedToRawItems('Feed', many)).toHaveLength(10);
  });

  it('truncates the summary to 500 chars', () => {
    const [item] = rssFeedToRawItems('Feed', [entry({ contentSnippet: 'x'.repeat(800) })]);
    expect(item.summary!.length).toBe(500);
  });
});
