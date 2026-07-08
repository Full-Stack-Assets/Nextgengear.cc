import { describe, it, expect } from 'vitest';
import { ytFeedToRawItems, type YtEntry } from '../youtube';

function entry(overrides: Partial<YtEntry> = {}): YtEntry {
  return {
    id: 'yt:video:XYZ',
    title: 'Hands-on with the new laptop',
    link: 'https://www.youtube.com/watch?v=XYZ123&feature=share',
    author: 'Tech Channel',
    isoDate: '2026-06-01T00:00:00.000Z',
    'media:group': { 'media:description': ['A detailed hands-on review.'] },
    ...overrides,
  };
}

describe('ytFeedToRawItems', () => {
  it('maps an entry, extracting the video id from the watch URL', () => {
    const [item] = ytFeedToRawItems([entry()], 'chan-1');
    expect(item).toMatchObject({
      id: 'youtube:XYZ123',
      source: 'youtube',
      title: 'Hands-on with the new laptop',
      url: 'https://www.youtube.com/watch?v=XYZ123&feature=share',
      author: 'Tech Channel',
      summary: 'A detailed hands-on review.',
      tags: ['video'],
    });
  });

  it('uses the channelId as author when the entry has none', () => {
    const [item] = ytFeedToRawItems([entry({ author: undefined })], 'chan-1');
    expect(item.author).toBe('chan-1');
  });

  it('skips entries missing a link or title', () => {
    const out = ytFeedToRawItems(
      [entry({ link: undefined }), entry({ title: undefined }), entry({ link: 'https://www.youtube.com/watch?v=OK' })],
      'chan-1'
    );
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('youtube:OK');
  });

  it('caps output at 5 entries', () => {
    const many = Array.from({ length: 8 }, (_, i) => entry({ link: `https://www.youtube.com/watch?v=V${i}` }));
    expect(ytFeedToRawItems(many, 'chan-1')).toHaveLength(5);
  });

  it('tolerates a missing media:group description', () => {
    const [item] = ytFeedToRawItems([entry({ 'media:group': undefined })], 'chan-1');
    expect(item.summary).toBeUndefined();
  });
});
