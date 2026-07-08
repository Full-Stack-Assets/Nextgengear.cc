import { describe, it, expect } from 'vitest';
import { redditListingToRawItems } from '../reddit';

function post(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      id: 'abc',
      title: 'New Pixel phone announced',
      url_overridden_by_dest: 'https://example.com/pixel',
      permalink: '/r/gadgets/comments/abc/new_pixel',
      author: 'alice',
      created_utc: 1_700_000_000,
      selftext: 'body text',
      ups: 340,
      num_comments: 42,
      stickied: false,
      over_18: false,
      ...overrides,
    },
  };
}

function listing(children: ReturnType<typeof post>[]) {
  return { data: { children } };
}

describe('redditListingToRawItems', () => {
  it('maps a post to a RawItem with the reddit source and subreddit tag', () => {
    const [item] = redditListingToRawItems(listing([post()]), 'gadgets');
    expect(item).toMatchObject({
      id: 'reddit:abc',
      source: 'reddit',
      title: 'New Pixel phone announced',
      url: 'https://example.com/pixel',
      author: 'alice',
      upvotes: 340,
      comments: 42,
      tags: ['gadgets'],
    });
    expect(item.publishedAt).toBe(new Date(1_700_000_000 * 1000).toISOString());
  });

  it('falls back to a reddit permalink when there is no external URL', () => {
    const [item] = redditListingToRawItems(
      listing([post({ url_overridden_by_dest: undefined, permalink: '/r/x/comments/abc/t' })]),
      'x'
    );
    expect(item.url).toBe('https://reddit.com/r/x/comments/abc/t');
  });

  it('skips stickied and NSFW posts', () => {
    const out = redditListingToRawItems(
      listing([post({ id: 's', stickied: true }), post({ id: 'n', over_18: true }), post({ id: 'ok' })]),
      'x'
    );
    expect(out.map((i) => i.id)).toEqual(['reddit:ok']);
  });

  it('returns [] for an empty or malformed listing', () => {
    expect(redditListingToRawItems({ data: { children: [] } }, 'x')).toEqual([]);
    // @ts-expect-error — exercising the defensive guard against a missing data field
    expect(redditListingToRawItems({}, 'x')).toEqual([]);
  });
});
