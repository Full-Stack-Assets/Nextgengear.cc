import { describe, it, expect } from 'vitest';
import { microblogText } from './index';

const URL = 'https://nextgengear.cc/blog/some-post';

describe('microblogText', () => {
  it('includes the title, description, and url when short enough', () => {
    const out = microblogText('Title', 'A short description', URL);
    expect(out).toBe(`Title — A short description\n\n${URL}`);
  });

  it('drops the description before it would overflow the 280-char limit', () => {
    const title = 'A reasonable headline';
    const out = microblogText(title, 'x'.repeat(400), URL);
    expect(out).toBe(`${title}\n\n${URL}`);
    expect(out.length).toBeLessThanOrEqual(280);
  });

  it('truncates an over-long title with an ellipsis and still fits the limit', () => {
    const out = microblogText('word '.repeat(100).trim(), 'desc', URL);
    expect(out.length).toBeLessThanOrEqual(280);
    expect(out).toContain('…');
    expect(out.endsWith(`\n\n${URL}`)).toBe(true);
  });
});
