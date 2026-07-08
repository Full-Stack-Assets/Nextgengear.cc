import { describe, it, expect } from 'vitest';
import { lobstersToRawItems } from '../lobsters';

const KEYWORDS = ['pixel', 'laptop', 'gpu', 'headphones'] as const;

function story(overrides: Record<string, unknown> = {}) {
  return {
    short_id: 'abc123',
    title: 'New Pixel phone announced',
    url: 'https://example.com/pixel',
    score: 42,
    comment_count: 12,
    created_at: '2026-06-01T12:00:00.000Z',
    comments_url: 'https://lobste.rs/s/abc123',
    submitter_user: 'alice',
    tags: ['mobile', 'hardware'],
    ...overrides,
  };
}

describe('lobstersToRawItems', () => {
  it('maps a matching story to a RawItem with the lobsters source', () => {
    const [item] = lobstersToRawItems([story()], KEYWORDS);
    expect(item).toMatchObject({
      id: 'lobsters:abc123',
      source: 'lobsters',
      title: 'New Pixel phone announced',
      url: 'https://example.com/pixel',
      author: 'alice',
      upvotes: 42,
      comments: 12,
    });
    expect(new Date(item.publishedAt).toISOString()).toBe('2026-06-01T12:00:00.000Z');
  });

  it('filters out stories that do not match any niche keyword', () => {
    const off = story({ title: 'A new Haskell type-checker', tags: ['programming', 'haskell'] });
    expect(lobstersToRawItems([off], KEYWORDS)).toHaveLength(0);
  });

  it('matches a keyword found only in the tags', () => {
    const viaTag = story({ title: 'Generic hardware review', tags: ['gpu'] });
    expect(lobstersToRawItems([viaTag], KEYWORDS)).toHaveLength(1);
  });

  it('is case-insensitive on the keyword match', () => {
    const upper = story({ title: 'The best LAPTOP of the year', tags: [] });
    expect(lobstersToRawItems([upper], KEYWORDS)).toHaveLength(1);
  });

  it('accepts submitter_user as an object with a username', () => {
    const [item] = lobstersToRawItems([story({ submitter_user: { username: 'bob' } })], KEYWORDS);
    expect(item.author).toBe('bob');
  });

  it('skips malformed stories with no title or url', () => {
    const out = lobstersToRawItems(
      [story({ title: '' }), story({ url: '' }), story()],
      KEYWORDS
    );
    expect(out).toHaveLength(1);
  });

  it('falls back to now for an unparseable date', () => {
    const [item] = lobstersToRawItems([story({ created_at: 'not-a-date' })], KEYWORDS);
    expect(Number.isNaN(new Date(item.publishedAt).getTime())).toBe(false);
  });

  it('coerces a non-numeric score/comment_count to 0', () => {
    const [item] = lobstersToRawItems(
      [story({ score: undefined, comment_count: undefined })],
      KEYWORDS
    );
    expect(item.upvotes).toBe(0);
    expect(item.comments).toBe(0);
  });
});
