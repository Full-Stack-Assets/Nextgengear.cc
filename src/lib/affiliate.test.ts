import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  amazonSearchUrl,
  isShoppableCategory,
  AFFILIATE_DISCLOSURE,
  AFFILIATE_ENABLED,
} from './affiliate';

describe('amazonSearchUrl', () => {
  it('builds a valid Amazon search URL from a product name', () => {
    const url = amazonSearchUrl('Sony WH-1000XM5');
    expect(url).toMatch(/^https:\/\/www\.amazon\.com\/s\?k=/);
    expect(url).toContain('Sony%20WH-1000XM5');
  });

  it('URL-encodes special characters', () => {
    expect(amazonSearchUrl('a & b')).toContain('a%20%26%20b');
  });

  it('omits the tag when none is configured (default)', () => {
    // Default config ships with an empty tag, so links are unattributed.
    expect(AFFILIATE_ENABLED).toBe(false);
    expect(amazonSearchUrl('anything')).not.toContain('tag=');
  });
});

describe('isShoppableCategory', () => {
  it('recognizes buyable product categories', () => {
    for (const c of ['reviews', 'audio', 'mobile', 'wearables', 'smarthome']) {
      expect(isShoppableCategory(c)).toBe(true);
    }
  });

  it('is case-insensitive and trims', () => {
    expect(isShoppableCategory('  Audio ')).toBe(true);
  });

  it('rejects non-product categories', () => {
    expect(isShoppableCategory('news')).toBe(false);
    expect(isShoppableCategory('')).toBe(false);
  });
});

describe('AFFILIATE_DISCLOSURE', () => {
  it('is a non-empty FTC-style disclosure', () => {
    expect(AFFILIATE_DISCLOSURE).toMatch(/commission/i);
  });
});

describe('tag injection (configured)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('appends the associate tag when the env var is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG', 'nextgengear-20');
    vi.resetModules();
    const mod = await import('./affiliate');
    expect(mod.AFFILIATE_ENABLED).toBe(true);
    const url = mod.amazonSearchUrl('iPhone 16');
    expect(url).toContain('tag=nextgengear-20');
  });
});
