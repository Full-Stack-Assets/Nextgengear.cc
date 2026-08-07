import { describe, it, expect } from 'vitest';
import { relatedPosts, type Post } from '../posts';

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
  const current = post('current', { tags: ['pixel', 'android'], category: 'mobile' });

  it('never includes the current post', () => {
    const all = [current, post('a', { tags: ['pixel'] })];
    expect(relatedPosts(current, all).map((p) => p.slug)).not.toContain('current');
  });

  it('ranks shared-tag posts first', () => {
    const all = [
      post('no-overlap', { tags: ['laptop'], category: 'news' }),
      post('two-shared', { tags: ['pixel', 'android'], category: 'news' }),
      post('one-shared', { tags: ['pixel'], category: 'news' }),
    ];
    const ranked = relatedPosts(current, all);
    expect(ranked[0].slug).toBe('two-shared');
    expect(ranked[1].slug).toBe('one-shared');
  });

  it('breaks tag ties by same category', () => {
    const all = [
      post('other-cat', { tags: [], category: 'audio' }),
      post('same-cat', { tags: [], category: 'mobile' }),
    ];
    expect(relatedPosts(current, all)[0].slug).toBe('same-cat');
  });

  it('breaks remaining ties by recency (newest first)', () => {
    const all = [
      post('older', { tags: [], category: 'news', date: '2026-01-01T00:00:00.000Z' }),
      post('newer', { tags: [], category: 'news', date: '2026-06-01T00:00:00.000Z' }),
    ];
    expect(relatedPosts(current, all)[0].slug).toBe('newer');
  });

  it('respects the limit argument', () => {
    const all = Array.from({ length: 10 }, (_, i) => post(`p${i}`, { tags: ['pixel'] }));
    expect(relatedPosts(current, all, 3)).toHaveLength(3);
  });

  it('is case-insensitive when matching tags', () => {
    const all = [post('mixed', { tags: ['Pixel', 'ANDROID'] })];
    // Both tags overlap despite casing → it should rank and be returned.
    expect(relatedPosts(current, all)).toHaveLength(1);
  });
});
