import { describe, expect, it } from 'vitest';
import { isRelevantGearItem, isRelevantGearPost } from './relevance';
import type { RawItem } from './types';

function item(title: string, summary = ''): RawItem {
  return { id: title, source: 'rss', title, summary, url: 'https://example.com', publishedAt: new Date().toISOString() };
}

describe('isRelevantGearItem', () => {
  it.each([
    'Power Book III episode recap',
    'Tristan Casas has left wrist surgery',
    'Martin Perez signs with the Braves',
    'Wyndham Championship fantasy betting picks',
    'Tucson heat advisory continues',
    "McDonald's backpack giveaway",
    'Neymar assist wins the match',
    'Biden announces a new policy',
  ])('rejects general-interest drift: %s', (title) => {
    expect(isRelevantGearItem(item(title))).toBe(false);
  });

  it.each([
    'Western Digital SSD benchmark shows a major speed gain',
    'IntelliJ IDEA adds a new developer tool extension',
    'New smartphone release brings longer battery life',
    'Wireless earbuds launch with improved audio',
    'Microsoft launches a new laptop',
  ])('accepts consumer technology: %s', (title) => {
    expect(isRelevantGearItem(item(title))).toBe(true);
  });

  it('uses the same gate for persisted posts', () => {
    expect(isRelevantGearPost({ title: 'Neymar assist wins the match', tags: ['sports'] })).toBe(false);
    expect(isRelevantGearPost({ title: 'Western Digital earnings follow new SSD launch', tags: ['hardware'] })).toBe(true);
  });
});
