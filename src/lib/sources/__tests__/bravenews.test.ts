import { describe, it, expect } from 'vitest';
import { braveResultsToRawItems, parseRelativeAge } from '../bravenews';

function result(overrides: Record<string, unknown> = {}) {
  return {
    url: 'https://example.com/story',
    title: 'A new smartphone launches',
    description: 'Details about the launch.',
    age: '2 hours ago',
    meta_url: { hostname: 'example.com' },
    ...overrides,
  };
}

describe('braveResultsToRawItems', () => {
  it('maps a result to a RawItem with the bravenews source and query tag', () => {
    const [item] = braveResultsToRawItems([result()], 'new smartphone release');
    expect(item).toMatchObject({
      source: 'bravenews',
      title: 'A new smartphone launches',
      url: 'https://example.com/story',
      author: 'example.com',
      summary: 'Details about the launch.',
      tags: ['new smartphone release'],
    });
    expect(item.id.startsWith('brave:')).toBe(true);
  });

  it('derives a stable base64url id from the URL', () => {
    const a = braveResultsToRawItems([result()], 'q')[0];
    const b = braveResultsToRawItems([result()], 'q')[0];
    expect(a.id).toBe(b.id);
    expect(a.id).not.toMatch(/[+/=]/); // base64url, not standard base64
  });

  it('prefers page_age over age for the timestamp', () => {
    const [item] = braveResultsToRawItems(
      [result({ page_age: '2025-01-15T00:00:00.000Z', age: '5 days ago' })],
      'q'
    );
    expect(item.publishedAt).toBe('2025-01-15T00:00:00.000Z');
  });
});

describe('parseRelativeAge', () => {
  it('parses an absolute date', () => {
    expect(parseRelativeAge('January 15, 2025')).toBe(new Date('January 15, 2025').toISOString());
  });

  it('parses "N hours ago" relative to now', () => {
    const iso = parseRelativeAge('3 hours ago');
    const delta = Date.now() - new Date(iso).getTime();
    expect(delta).toBeGreaterThan(2.9 * 3_600_000);
    expect(delta).toBeLessThan(3.1 * 3_600_000);
  });

  it('falls back to now for an unparseable/empty value', () => {
    expect(Number.isNaN(new Date(parseRelativeAge(undefined)).getTime())).toBe(false);
    expect(Number.isNaN(new Date(parseRelativeAge('whenever')).getTime())).toBe(false);
  });
});
