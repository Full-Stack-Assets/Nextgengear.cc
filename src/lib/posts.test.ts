import { describe, it, expect } from 'vitest';
import { relatedPosts } from './posts';
import type { Post } from './posts';

function post(slug: string, opts: { tags?: string[]; category?: string; date?: string } = {}): Post {
  return {
    slug,
    frontmatter: {
      title: slug,
      description: '',
      date: opts.date ?? '2026-01-01T00:00:00.000Z',
      category: opts.category ?? 'news',
      tags: opts.tags ?? [],
      hero: { url: '', alt: '', credit: '', creditUrl: '' },
      sources: [],
    },
    body: '',
    readingTimeMin: 1,
  };
}

describe('relatedPosts', () => {
  const current = post('current', { tags: ['ai', 'gpu'], category: 'reviews' });

  it('ranks shared-tag posts first', () => {
    const all = [
      current,
      post('no-overlap', { tags: ['sports'], category: 'news' }),
      post('two-shared', { tags: ['ai', 'gpu'], category: 'news' }),
      post('one-shared', { tags: ['ai'], category: 'news' }),
    ];
    const related = relatedPosts(current, all);
    expect(related[0].slug).toBe('two-shared');
    expect(related[1].slug).toBe('one-shared');
  });

  it('falls back to same-category, then recency, and never includes itself', () => {
    const all = [
      current,
      post('same-cat-new', { category: 'reviews', date: '2026-05-01T00:00:00.000Z' }),
      post('same-cat-old', { category: 'reviews', date: '2026-01-01T00:00:00.000Z' }),
      post('other-cat', { category: 'news', date: '2026-06-01T00:00:00.000Z' }),
    ];
    const related = relatedPosts(current, all);
    expect(related.map((p) => p.slug)).not.toContain('current');
    // Same-category posts outrank the newer other-category post.
    expect(related[0].slug).toBe('same-cat-new');
    expect(related[1].slug).toBe('same-cat-old');
  });

  it('respects the limit', () => {
    const all = [current, ...Array.from({ length: 10 }, (_, i) => post(`p${i}`))];
    expect(relatedPosts(current, all, 3)).toHaveLength(3);
  });

  it('returns an empty list when there are no other posts', () => {
    expect(relatedPosts(current, [current])).toEqual([]);
  });
});
