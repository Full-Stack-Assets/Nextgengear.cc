import { describe, it, expect } from 'vitest';
import matter from 'gray-matter';
import { serialize, sanitizeBody } from '../serialize';
import type { GeneratedPost } from '../types';

function post(overrides: Partial<GeneratedPost> = {}): GeneratedPost {
  return {
    slug: 'the-new-pixel-phone',
    title: 'The New Pixel Phone Is Here',
    description: 'A concise, SEO-friendly description.',
    tags: ['pixel', 'android'],
    category: 'mobile',
    heroImage: {
      url: 'https://img.example.com/hero.jpg',
      alt: 'A phone on a desk',
      credit: 'Jane Doe',
      creditUrl: 'https://example.com/jane',
    },
    body: 'Lead paragraph.\n\n<Callout type="takeaway">One line.</Callout>\n\n## What happened\nStuff.',
    sources: [{ title: 'Source One', url: 'https://example.com/one' }],
    ...overrides,
  };
}

describe('serialize', () => {
  it('produces frontmatter that gray-matter can parse back', () => {
    const mdx = serialize(post());
    const { data, content } = matter(mdx);
    expect(data.title).toBe('The New Pixel Phone Is Here');
    expect(data.category).toBe('mobile');
    expect(data.tags).toEqual(['pixel', 'android']);
    expect(data.hero.url).toBe('https://img.example.com/hero.jpg');
    expect(data.sources[0]).toEqual({ title: 'Source One', url: 'https://example.com/one' });
    expect(content.trim().startsWith('Lead paragraph.')).toBe(true);
  });

  it('emits an ISO date string', () => {
    const { data } = matter(serialize(post()));
    expect(() => new Date(data.date).toISOString()).not.toThrow();
    expect(new Date(data.date).getTime()).not.toBeNaN();
  });

  it('escapes double quotes in string values so YAML stays valid', () => {
    const mdx = serialize(post({ title: 'He said "hello" loudly' }));
    const { data } = matter(mdx);
    expect(data.title).toBe('He said "hello" loudly');
  });

  it('serializes an empty sources array as [] (parses to empty array)', () => {
    const { data } = matter(serialize(post({ sources: [] })));
    expect(data.sources).toEqual([]);
  });

  it('ends the file with a single trailing newline', () => {
    const mdx = serialize(post());
    expect(mdx.endsWith('\n')).toBe(true);
    expect(mdx.endsWith('\n\n')).toBe(false);
  });
});

describe('sanitizeBody', () => {
  it('replaces inner double quotes inside a Question attribute with single quotes', () => {
    const body = '<Question q="What about the "limited" plan?">Answer.</Question>';
    expect(sanitizeBody(body)).toBe(
      "<Question q=\"What about the 'limited' plan?\">Answer.</Question>"
    );
  });

  it('leaves well-formed Question attributes untouched', () => {
    const body = '<Question q="Is it worth it?">Yes.</Question>';
    expect(sanitizeBody(body)).toBe(body);
  });

  it('does not touch double quotes in the answer body', () => {
    const body = '<Question q="Q?">He said "hi" to me.</Question>';
    expect(sanitizeBody(body)).toContain('He said "hi" to me.');
  });

  it('handles multiple Question tags independently', () => {
    const body =
      '<Question q="A "b" c">one</Question>\n<Question q="d "e" f">two</Question>';
    const out = sanitizeBody(body);
    expect(out).toContain("q=\"A 'b' c\"");
    expect(out).toContain("q=\"d 'e' f\"");
  });
});
