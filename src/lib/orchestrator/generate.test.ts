import { describe, it, expect } from 'vitest';
import { clampMeta, slugify, normalizeTags, extractJson, PostSchema, checkMdxStructure } from './generate';

describe('clampMeta', () => {
  it('collapses whitespace and leaves short strings intact', () => {
    expect(clampMeta('hello   world')).toBe('hello world');
  });

  it('truncates at a word boundary and appends an ellipsis', () => {
    const out = clampMeta('one two three four five', 12);
    expect(out.length).toBeLessThanOrEqual(12);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toContain('  ');
  });
});

describe('slugify', () => {
  it('produces a kebab-case slug', () => {
    expect(slugify('Hello, World! 2026')).toBe('hello-world-2026');
  });

  it('trims leading/trailing separators and caps length', () => {
    expect(slugify('  --Edge Case--  ')).toBe('edge-case');
    expect(slugify('a'.repeat(100)).length).toBeLessThanOrEqual(60);
  });
});

describe('normalizeTags', () => {
  it('lowercases, dedupes, drops blanks, and caps at 6', () => {
    expect(normalizeTags(['Apple', 'apple', ' ', 'B', 'c', 'd', 'e', 'f', 'g'])).toEqual([
      'apple', 'b', 'c', 'd', 'e', 'f',
    ]);
  });
});

describe('extractJson', () => {
  it('returns already-valid JSON untouched (trimmed)', () => {
    expect(extractJson('  {"a":1}  ')).toBe('{"a":1}');
  });

  it('strips a ```json fence', () => {
    expect(JSON.parse(extractJson('```json\n{"a":1}\n```'))).toEqual({ a: 1 });
  });

  it('recovers the outermost brace span from a prose preamble', () => {
    expect(JSON.parse(extractJson('Here you go: {"a":1} thanks'))).toEqual({ a: 1 });
  });
});

describe('PostSchema self-healing', () => {
  const valid = {
    title: 'A sufficiently long and specific headline about a thing',
    description: 'A concise SEO description.',
    slug: 'Some Messy Slug!!',
    category: '  News  ',
    tags: ['Alpha', 'alpha', 'Beta'],
    body: 'x'.repeat(900),
  };

  it('heals recoverable overshoots (slug, category, tags) instead of throwing', () => {
    const parsed = PostSchema.parse(valid);
    expect(parsed.slug).toBe('some-messy-slug');
    expect(parsed.category).toBe('news');
    expect(parsed.tags).toEqual(['alpha', 'beta']);
  });

  it('clamps an over-long title', () => {
    const parsed = PostSchema.parse({ ...valid, title: 'word '.repeat(60) });
    expect(parsed.title.length).toBeLessThanOrEqual(120);
  });

  it('rejects a too-short body (drives a retry)', () => {
    const r = PostSchema.safeParse({ ...valid, body: 'too short' });
    expect(r.success).toBe(false);
  });

  it('rejects fewer than two real tags', () => {
    const r = PostSchema.safeParse({ ...valid, tags: ['only'] });
    expect(r.success).toBe(false);
  });
});

describe('checkMdxStructure', () => {
  const goodBody = `Lead paragraph here.

<Callout type="takeaway">The point.</Callout>

## What happened
Text.

<ProsCons>
  <Pros><li>a</li><li>b</li><li>c</li></Pros>
  <Cons><li>x</li><li>y</li><li>z</li></Cons>
</ProsCons>

## How to think about it
More text.

<BuyBox product="Some Thing" />

## FAQ
<FAQ>
  <Question q="One?">A.</Question>
  <Question q="Two?">B.</Question>
  <Question q="Three?">C.</Question>
</FAQ>`;

  it('accepts a well-formed body (including a self-closing BuyBox)', () => {
    expect(checkMdxStructure(goodBody)).toBeNull();
  });

  it('flags an unclosed <Cons> block', () => {
    const bad = goodBody.replace('</Cons>\n</ProsCons>', '</ProsCons>');
    expect(checkMdxStructure(bad)).toMatch(/unbalanced <Cons>/);
  });

  it('flags a <Question> whose q attribute never closes', () => {
    const bad = goodBody.replace('<Question q="One?">A.</Question>', '<Question q="One?A.</Question>');
    expect(checkMdxStructure(bad)).toMatch(/unbalanced <Question>|malformed <Question>/);
  });

  it('flags an unbalanced Callout', () => {
    expect(checkMdxStructure('<Callout type="note">no close')).toMatch(/unbalanced <Callout>/);
  });
});
