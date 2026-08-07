import { describe, it, expect } from 'vitest';
import { serialize, sanitizeBody } from './serialize';
import type { GeneratedPost } from './types';

function post(overrides: Partial<GeneratedPost> = {}): GeneratedPost {
  return {
    slug: 'test-post',
    title: 'Test: a "quoted" title',
    description: 'A description with: a colon',
    tags: ['one', 'two'],
    category: 'reviews',
    heroImage: { url: 'https://img/x.jpg', alt: 'alt', credit: 'c', creditUrl: 'https://img' },
    body: 'Lead paragraph.\n\n## What happened\nStuff.',
    sources: [{ title: 'Src', url: 'https://src' }],
    ...overrides,
  };
}

describe('sanitizeBody', () => {
  it('replaces inner double quotes inside <Question q="..."> attributes', () => {
    const body = '<Question q="the "limited" plan">Answer</Question>';
    expect(sanitizeBody(body)).toBe("<Question q=\"the 'limited' plan\">Answer</Question>");
  });

  it('leaves well-formed questions untouched', () => {
    const body = '<Question q="Is it safe?">Yes.</Question>';
    expect(sanitizeBody(body)).toBe(body);
  });

  it('collapses a multi-line answer onto one line (the build-breaking pattern)', () => {
    const body = '<Question q="When?">\n    The trial begins August 13.\n  </Question>';
    expect(sanitizeBody(body)).toBe('<Question q="When?">The trial begins August 13.</Question>');
  });

  it('strips a leftover "Answer paragraph." placeholder', () => {
    const body = '<Question q="Why?">Answer paragraph.\n    Because reasons.\n  </Question>';
    expect(sanitizeBody(body)).toBe('<Question q="Why?">Because reasons.</Question>');
  });

  it('handles multiple questions in one FAQ block', () => {
    const body =
      '<FAQ>\n  <Question q="A?">Answer paragraph.\n    One.\n  </Question>\n' +
      '  <Question q="B?">Answer paragraph.\n    Two.\n  </Question>\n</FAQ>';
    const out = sanitizeBody(body);
    expect(out).toContain('<Question q="A?">One.</Question>');
    expect(out).toContain('<Question q="B?">Two.</Question>');
    expect(out).not.toContain('Answer paragraph.');
  });
});

describe('serialize', () => {
  it('emits YAML frontmatter delimited by --- and then the body', () => {
    const out = serialize(post());
    expect(out.startsWith('---\n')).toBe(true);
    expect(out).toMatch(/\n---\n\n/);
    expect(out.trimEnd().endsWith('Stuff.')).toBe(true);
  });

  it('escapes double quotes in string values so the YAML stays valid', () => {
    const out = serialize(post());
    expect(out).toContain('title: "Test: a \\"quoted\\" title"');
  });

  it('serializes nested hero object and sources array', () => {
    const out = serialize(post());
    expect(out).toContain('hero:');
    expect(out).toContain('url: "https://img/x.jpg"');
    expect(out).toContain('sources:');
    expect(out).toContain('- title: "Src"');
  });

  it('sanitizes the body on the way out', () => {
    const out = serialize(post({ body: '<Question q="a "b" c">d</Question>' }));
    expect(out).toContain("q=\"a 'b' c\"");
  });
});
