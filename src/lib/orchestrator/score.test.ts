import { describe, it, expect } from 'vitest';
import { score, signature, dedupe, pickWinner } from './score';
import type { RawItem, ScoredItem, TopicLog } from './types';

function raw(partial: Partial<RawItem> & { id: string; title: string }): RawItem {
  return {
    source: 'reddit',
    url: `https://example.com/${partial.id}`,
    publishedAt: new Date().toISOString(),
    ...partial,
  } as RawItem;
}

describe('score', () => {
  it('returns a score and a 3-axis breakdown per item', () => {
    const [s] = score([raw({ id: '1', title: 'A', upvotes: 100, comments: 10 })]);
    expect(s.score).toBeGreaterThan(0);
    expect(s.breakdown).toHaveProperty('popularity');
    expect(s.breakdown).toHaveProperty('engagement');
    expect(s.breakdown).toHaveProperty('recency');
  });

  it('ranks a fresh, popular story above an old, unpopular one', () => {
    const now = Date.now();
    const items = score([
      raw({ id: 'fresh', title: 'Fresh hit', source: 'hackernews', upvotes: 500, comments: 200, publishedAt: new Date(now).toISOString() }),
      raw({ id: 'stale', title: 'Old miss', source: 'hackernews', upvotes: 1, comments: 0, publishedAt: new Date(now - 1000 * 3600 * 240).toISOString() }),
    ]);
    const fresh = items.find((i) => i.id === 'fresh')!;
    const stale = items.find((i) => i.id === 'stale')!;
    expect(fresh.score).toBeGreaterThan(stale.score);
  });

  it('decays recency by ~half over 24h', () => {
    const now = Date.now();
    const [s] = score([
      raw({ id: 'x', title: 'x', upvotes: 0, comments: 0, publishedAt: new Date(now - 24 * 3600 * 1000).toISOString() }),
    ]);
    expect(s.breakdown.recency).toBeCloseTo(0.5, 1);
  });

  it('applies source weighting (HN > YouTube for equal signal)', () => {
    const [hn] = score([raw({ id: 'a', title: 'a', source: 'hackernews', upvotes: 100 })]);
    const [yt] = score([raw({ id: 'b', title: 'b', source: 'youtube', upvotes: 100 })]);
    // With a single item per source, normalizedUp is 1.0, so popularity == weight.
    expect(hn.breakdown.popularity).toBeGreaterThan(yt.breakdown.popularity);
  });
});

describe('signature', () => {
  it('collapses word-order and punctuation variants to the same fingerprint', () => {
    expect(signature('GPT-5 released today!')).toBe(signature('Today: GPT-5 is out, released'));
  });

  it('is stable and 16 hex chars', () => {
    const sig = signature('Some Headline Here');
    expect(sig).toMatch(/^[0-9a-f]{16}$/);
    expect(signature('Some Headline Here')).toBe(sig);
  });

  it('distinguishes genuinely different titles', () => {
    expect(signature('Apple ships new iPhone')).not.toBe(signature('Nvidia unveils new GPU'));
  });
});

describe('dedupe', () => {
  it('keeps only the highest-scoring item per signature', () => {
    const items: ScoredItem[] = [
      { ...raw({ id: 'low', title: 'GPT five is released' }), score: 0.2, breakdown: { popularity: 0, engagement: 0, recency: 0 } },
      { ...raw({ id: 'high', title: 'Released: GPT five' }), score: 0.9, breakdown: { popularity: 0, engagement: 0, recency: 0 } },
      { ...raw({ id: 'other', title: 'Completely different subject matter' }), score: 0.5, breakdown: { popularity: 0, engagement: 0, recency: 0 } },
    ];
    const out = dedupe(items);
    expect(out).toHaveLength(2);
    expect(out.map((o) => o.id)).toContain('high');
    expect(out.map((o) => o.id)).not.toContain('low');
  });
});

describe('pickWinner', () => {
  const scored = (id: string, title: string): ScoredItem => ({
    ...raw({ id, title }),
    score: 1,
    breakdown: { popularity: 0, engagement: 0, recency: 0 },
  });

  it('skips candidates already in the topic log', () => {
    const covered = scored('a', 'Already covered story');
    const fresh = scored('b', 'A brand new untold story');
    const log: TopicLog = {
      topics: [{ slug: 'a', title: 'Already covered story', url: '', publishedAt: '', signature: signature('Already covered story') }],
    };
    const winner = pickWinner([covered, fresh], log);
    expect(winner?.id).toBe('b');
  });

  it('returns null when every candidate is already covered', () => {
    const a = scored('a', 'Only story');
    const log: TopicLog = { topics: [{ slug: 'a', title: 'Only story', url: '', publishedAt: '', signature: signature('Only story') }] };
    expect(pickWinner([a], log)).toBeNull();
  });
});
