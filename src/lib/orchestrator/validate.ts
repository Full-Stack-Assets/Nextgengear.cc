import { serialize } from 'next-mdx-remote/serialize';

/**
 * MDX well-formedness guard.
 *
 * The LLM occasionally emits structurally-invalid MDX — an unclosed `<Cons>`, a
 * `<Question>` whose `q="…"` attribute is never terminated, a truncated FAQ.
 * `PostSchema` (zod) validates the JSON *shape* but can't see that the `body`
 * string won't compile, so a malformed post sails through generation and only
 * explodes at build time (`next build` prerender), taking the whole site's
 * deploy down with it.
 *
 * `validateMdx` closes that gap by running the body through the exact compiler
 * the site renders with (`next-mdx-remote`). It's used two ways:
 *   1. In `generate.ts`, as a final gate before a post is accepted — a failure
 *      feeds the compiler error back into the retry loop so the model fixes it.
 *   2. In `scripts/validate-content.mjs` / CI, as a safety net over committed
 *      content so a bad post can never reach `main` silently.
 */

export type MdxValidation = { ok: true } | { ok: false; error: string };

export async function validateMdx(body: string): Promise<MdxValidation> {
  try {
    // parseFrontmatter:false — callers pass the body only (frontmatter is
    // serialized separately and is plain YAML, not MDX).
    await serialize(body, { parseFrontmatter: false });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: compactError(err) };
  }
}

/**
 * Collapse an MDX compile error into a single actionable line to feed back to
 * the model (or print in CI). The MDX compiler's message leads with the reason
 * and location (e.g. "Expected a closing tag for `<Cons>` (22:3-22:9)"), which
 * is exactly what a retry needs — the surrounding code-frame is noise here.
 */
function compactError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const line = msg
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !/^\[?next-mdx-remote\]?/i.test(l) && !l.startsWith('error compiling MDX'));
  return (line ?? msg.split('\n')[0] ?? 'invalid MDX').slice(0, 300);
}
