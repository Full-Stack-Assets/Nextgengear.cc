# Testing & CI

This project ships with an automated test suite and a CI gate so the generation
pipeline and the site can be refactored safely. The engine writes content
autonomously every hour, so the tests exist to make sure a bad post — or a
regression in the pure logic that scores, heals, and serializes posts — can't
quietly take the live site down.

## Commands

```bash
npm test              # run the whole suite once (Vitest)
npm run test:watch    # watch mode while developing
npm run test:coverage # suite + a coverage report (text + html)
npm run typecheck     # tsc --noEmit
npm run validate:content   # compile every content/posts/*.mdx (subset of npm test)
npm run sanitize      # normalize existing posts' MDX in place (maintenance)
```

## What's covered

Unit tests live next to the code as `*.test.ts` under `src/lib/`, plus a
catalog-wide content check under `tests/`.

| Area | File | What it guards |
|---|---|---|
| Scoring / dedupe | `src/lib/orchestrator/score.test.ts` | composite score, recency half-life, source weighting, title `signature` collisions, `pickWinner` skipping logged topics |
| Writer contract | `src/lib/orchestrator/generate.test.ts` | `clampMeta`/`slugify`/`normalizeTags` transforms, `extractJson` recovery, `PostSchema` self-heal vs. retry, and `checkMdxStructure` tag-balance guard |
| Serialization | `src/lib/orchestrator/serialize.test.ts` | YAML frontmatter emission, quote escaping, and `sanitizeBody` fixing the recurring build-breaking `<Question>` patterns |
| Affiliate | `src/lib/affiliate.test.ts` | Amazon search-URL building, tag injection, shoppable-category gating |
| Related posts | `src/lib/posts.test.ts` | `relatedPosts` ranking (shared tags → category → recency) |
| Syndication | `src/lib/syndicate/microblog.test.ts` | microblog text fits the 280-char ceiling |
| **All content** | `tests/content-compiles.test.ts` | every published post compiles as valid MDX — one test per file, so a failure names the exact broken post |

## The content-compiles guard

A single malformed post makes `next build` abort the entire static export, which
takes the whole site offline. `tests/content-compiles.test.ts` compiles every
post with the same compiler `next-mdx-remote` uses, in seconds, so structurally
broken MDX (unclosed `<Cons>`, an unterminated `q="…"`, stray tags) is caught in
CI on the exact file rather than discovered in production.

Two layers back this up so bad MDX never reaches a commit:

1. **At generation** — `checkMdxStructure` (in `generate.ts`) rejects a
   structurally unbalanced post and retries the LLM, and `sanitizeBody` (in
   `serialize.ts`) normalizes the known-recoverable patterns before writing.
2. **In CI** — the content-compiles test fails any PR that introduces or
   hand-edits a broken post.

If an older post ever slips through, `npm run sanitize` rewrites the whole
catalog through `sanitizeBody` (frontmatter preserved), and `npm run
validate:content` reports anything still broken.

## CI

`.github/workflows/ci.yml` runs on every pull request to `main` and every push
to a non-main branch:

```
npm ci → npm run typecheck → npm test → npm run build
```

The hourly content bot commits generated posts straight to `main` (content only,
no code), so main pushes are excluded to avoid burning Actions minutes — the
generation guard above is what protects those commits.
