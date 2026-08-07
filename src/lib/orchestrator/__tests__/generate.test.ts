import { describe, it, expect } from 'vitest';
import { clampMeta, slugify, normalizeTags, extractJson, PostSchema } from '../generate';

describe('clampMeta', () => {
  it('collapses whitespace and trims', () => {
    expect(clampMeta('  hello   world \n\t here ')).toBe('hello world here');
  });

  it('leaves short strings unchanged', () => {
    expect(clampMeta('short enough', 200)).toBe('short enough');
  });

  it('truncates over-long strings at a word boundary with an ellipsis', () => {
    const out = clampMeta('one two three four five six', 12);
    expect(out.length).toBeLessThanOrEqual(12);
    expect(out.endsWith('…')).toBe(true);
    // Cut falls on a space, so only whole words survive before the ellipsis.
    expect(out).toBe('one two…');
    const words = out.slice(0, -1).trim().split(' ');
    expect('one two three four five six'.split(' ')).toEqual(expect.arrayContaining(words));
  });
});

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('The New Pixel Phone')).toBe('the-new-pixel-phone');
  });

  it('strips punctuation and collapses separators', () => {
    expect(slugify('Apple’s M4: Fast & Furious!!')).toBe('apple-s-m4-fast-furious');
  });

  it('trims leading/trailing hyphens', () => {
    expect(slugify('  --hello--  ')).toBe('hello');
  });

  it('caps length at 60 chars without a trailing hyphen', () => {
    const out = slugify('a'.repeat(80) + ' word');
    expect(out.length).toBeLessThanOrEqual(60);
    expect(out.endsWith('-')).toBe(false);
  });
});

describe('normalizeTags', () => {
  it('lowercases, trims, and removes duplicates', () => {
    expect(normalizeTags(['Pixel', ' pixel ', 'ANDROID'])).toEqual(['pixel', 'android']);
  });

  it('drops blank tags', () => {
    expect(normalizeTags(['a', '', '   ', 'b'])).toEqual(['a', 'b']);
  });

  it('caps at 6 tags', () => {
    expect(normalizeTags(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])).toHaveLength(6);
  });
});

describe('extractJson', () => {
  it('returns already-valid JSON untouched (aside from trimming)', () => {
    expect(extractJson('  {"a":1}  ')).toBe('{"a":1}');
  });

  it('strips a ```json code fence', () => {
    expect(JSON.parse(extractJson('```json\n{"a":1}\n```'))).toEqual({ a: 1 });
  });

  it('strips a bare ``` fence', () => {
    expect(JSON.parse(extractJson('```\n{"b":2}\n```'))).toEqual({ b: 2 });
  });

  it('recovers the object from a prose preamble', () => {
    const raw = 'Sure! Here is your post:\n{"c":3}\nHope that helps.';
    expect(JSON.parse(extractJson(raw))).toEqual({ c: 3 });
  });
});

describe('PostSchema', () => {
  const valid = {
    title: 'A Sufficiently Long And Specific Title Here',
    description: 'A fine description.',
    slug: 'a-fine-slug',
    category: 'Mobile',
    tags: ['pixel', 'android'],
    body: 'x'.repeat(900),
  };

  it('accepts and normalizes a valid post', () => {
    const res = PostSchema.safeParse(valid);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.category).toBe('mobile'); // lowercased transform
      expect(res.data.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('heals an over-long description instead of throwing', () => {
    const res = PostSchema.safeParse({ ...valid, description: 'word '.repeat(100) });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.description.length).toBeLessThanOrEqual(200);
  });

  it('heals a messy slug via the slugify transform', () => {
    const res = PostSchema.safeParse({ ...valid, slug: 'Not A Clean Slug!!' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.slug).toBe('not-a-clean-slug');
  });

  it('rejects a too-short body (drives a retry, not a heal)', () => {
    expect(PostSchema.safeParse({ ...valid, body: 'too short' }).success).toBe(false);
  });

  it('rejects fewer than two real tags', () => {
    expect(PostSchema.safeParse({ ...valid, tags: ['only-one'] }).success).toBe(false);
  });

  it('rejects a too-short title', () => {
    expect(PostSchema.safeParse({ ...valid, title: 'Short' }).success).toBe(false);
  });
});
