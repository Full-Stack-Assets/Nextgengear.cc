import { describe, it, expect } from 'vitest';
import { score, signature, dedupe, pickWinner } from '../score';
import type { RawItem, ScoredItem, TopicLog } from '../types';

function raw(partial: Partial<RawItem> & Pick<RawItem, 'id' | 'title'>): RawItem {
  return {
    source: 'hackernews',
    url: `https://example.com/${partial.id}`,
    publishedAt: new Date().toISOString(),
    ...partial,
  };
}

describe('score', () => {
  it('produces a score and breakdown for each item', () => {
    const [item] = score([raw({ id: '1', title: 'A', upvotes: 100, comments: 10 })]);
    expect(item.score).toBeGreaterThan(0);
    expect(item.breakdown).toHaveProperty('popularity');
    expect(item.breakdown).toHaveProperty('engagement');
    expect(item.breakdown).toHaveProperty('recency');
  });

  it('ranks a fresh, popular item above an old, unpopular one', () => {
    const now = new Date().toISOString();
    const old = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const [fresh, stale] = score([
      raw({ id: 'fresh', title: 'Fresh hit', upvotes: 500, comments: 120, publishedAt: now }),
      raw({ id: 'stale', title: 'Old news', upvotes: 5, comments: 0, publishedAt: old }),
    ]);
    expect(fresh.score).toBeGreaterThan(stale.score);
  });

  it('decays recency: same item published earlier scores lower', () => {
    const recent = raw({ id: 'r', title: 'x', upvotes: 50, publishedAt: new Date().toISOString() });
    const older = raw({
      id: 'o',
      title: 'x',
      upvotes: 50,
      publishedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    });
    const [a, b] = score([recent, older]);
    expect(a.breakdown.recency).toBeGreaterThan(b.breakdown.recency);
  });

  it('handles missing upvotes/comments without NaN', () => {
    const [item] = score([raw({ id: '1', title: 'No engagement numbers' })]);
    expect(Number.isNaN(item.score)).toBe(false);
    expect(item.breakdown.popularity).toBe(0);
  });

  it('applies a defined source weight for every source (no NaN popularity)', () => {
    const sources: RawItem['source'][] = [
      'reddit', 'hackernews', 'devto', 'rss', 'youtube', 'bravenews', 'googletrends', 'lobsters',
    ];
    const scored = score(sources.map((s, i) => raw({ id: String(i), title: `t${i}`, upvotes: 10, source: s })));
    for (const item of scored) expect(Number.isNaN(item.breakdown.popularity)).toBe(false);
  });
});

describe('signature', () => {
  it('is stable regardless of word order and punctuation', () => {
    expect(signature('The Quick Brown Fox!')).toBe(signature('fox brown quick the'));
  });

  it('ignores short filler words (<= 3 chars)', () => {
    expect(signature('New Pixel phone is out')).toBe(signature('pixel phone'));
  });

  it('distinguishes genuinely different titles', () => {
    expect(signature('Apple launches new iPhone')).not.toBe(signature('Samsung reveals Galaxy watch'));
  });

  it('returns a 16-char hex fingerprint', () => {
    expect(signature('anything at all here')).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('dedupe', () => {
  function scored(id: string, title: string, s: number): ScoredItem {
    return {
      ...raw({ id, title }),
      score: s,
      breakdown: { popularity: 0, engagement: 0, recency: 0 },
    };
  }

  it('collapses near-duplicate titles, keeping the highest score', () => {
    const out = dedupe([
      scored('a', 'Apple unveils the new iPhone 20', 0.4),
      scored('b', 'iPhone 20 unveils, Apple the new', 0.9),
      scored('c', 'Completely different story here', 0.5),
    ]);
    expect(out).toHaveLength(2);
    // The survivor of the dup pair is the higher-scored one.
    expect(out.map((i) => i.id)).toContain('b');
    expect(out.map((i) => i.id)).not.toContain('a');
  });

  it('returns items sorted by descending score', () => {
    const out = dedupe([
      scored('a', 'first unique headline', 0.2),
      scored('b', 'second unique headline', 0.8),
    ]);
    expect(out[0].score).toBeGreaterThanOrEqual(out[1].score);
  });
});

describe('pickWinner', () => {
  function scored(id: string, title: string, s: number): ScoredItem {
    return {
      ...raw({ id, title }),
      score: s,
      breakdown: { popularity: 0, engagement: 0, recency: 0 },
    };
  }

  it('picks the first candidate not already in the topic log', () => {
    const items = [scored('a', 'Already covered story', 0.9), scored('b', 'Brand new story', 0.8)];
    const log: TopicLog = {
      topics: [
        { slug: 'x', title: 'Already covered story', url: '', publishedAt: '', signature: signature('Already covered story') },
      ],
    };
    const winner = pickWinner(items, log);
    expect(winner?.id).toBe('b');
  });

  it('returns null when every candidate is already covered', () => {
    const items = [scored('a', 'Seen one', 0.9)];
    const log: TopicLog = {
      topics: [{ slug: 'x', title: 'Seen one', url: '', publishedAt: '', signature: signature('Seen one') }],
    };
    expect(pickWinner(items, log)).toBeNull();
  });

  it('picks the first item when the log is empty', () => {
    const items = [scored('a', 'top', 0.9), scored('b', 'next', 0.5)];
    expect(pickWinner(items, { topics: [] })?.id).toBe('a');
  });
});
