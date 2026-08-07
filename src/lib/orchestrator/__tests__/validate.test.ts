import { describe, it, expect } from 'vitest';
import { validateMdx } from '../validate';

// A structurally-complete body mirroring the MDX content contract.
const GOOD_BODY = `Lead paragraph that hooks the reader and says what happened here.

<Callout type="takeaway">The single synthesizing sentence.</Callout>

## What happened
Some factual reporting in a paragraph.

## Why it matters
Analysis of the stakes and who is affected.

<ProsCons>
  <Pros>
    <li>Upside one.</li>
    <li>Upside two.</li>
    <li>Upside three.</li>
  </Pros>
  <Cons>
    <li>Downside one.</li>
    <li>Downside two.</li>
    <li>Downside three.</li>
  </Cons>
</ProsCons>

## How to think about it
Practical framing in prose.

## FAQ
<FAQ>
  <Question q="First question?">First answer.</Question>
  <Question q="Second question?">Second answer.</Question>
  <Question q="Third question?">Third answer.</Question>
</FAQ>`;

describe('validateMdx', () => {
  it('accepts a well-formed body', async () => {
    const res = await validateMdx(GOOD_BODY);
    expect(res.ok).toBe(true);
  });

  // Regression: the three real-world failure modes that broke the Vercel build.

  it('rejects a <Cons> that is never closed before </ProsCons>', async () => {
    const bad = GOOD_BODY.replace('  </Cons>\n', '');
    const res = await validateMdx(bad);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.toLowerCase()).toContain('cons');
  });

  it('rejects a <Question> with an unterminated q="…" attribute', async () => {
    const bad = GOOD_BODY.replace(
      '<Question q="First question?">First answer.</Question>',
      '<Question q="First question?\nFirst answer.\n</Question>'
    );
    const res = await validateMdx(bad);
    expect(res.ok).toBe(false);
  });

  it('rejects a truncated FAQ (unclosed <Question> and <FAQ>)', async () => {
    const bad = GOOD_BODY.replace('</Question>\n</FAQ>', '');
    const res = await validateMdx(bad);
    expect(res.ok).toBe(false);
  });

  it('returns a compact single-line error (no code-frame noise)', async () => {
    const bad = GOOD_BODY.replace('  </Cons>\n', '');
    const res = await validateMdx(bad);
    if (!res.ok) {
      expect(res.error).not.toContain('\n');
      expect(res.error.length).toBeLessThanOrEqual(300);
    }
  });
});
