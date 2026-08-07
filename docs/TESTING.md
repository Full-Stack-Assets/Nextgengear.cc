# Testing

The engine is validated by a [Vitest](https://vitest.dev) unit suite that
targets the **pure, deterministic logic** of the generation pipeline — the parts
that decide *what* gets published and *how* it's shaped, where a silent
regression would quietly degrade every post.

Network I/O, the LLM call, GitHub commits, and image lookups are intentionally
**not** unit-tested here: they're thin, side-effectful adapters best covered by
the pipeline's existing fail-soft fallbacks and a `--dry` run. Where a source or
helper mixes I/O with transformation, the transformation is factored into an
exported pure function (e.g. `lobstersToRawItems`, `toRawItems`) and *that* is
tested.

## Commands

```bash
npm test            # run the suite once (CI mode)
npm run test:watch  # re-run on change while developing
npm run test:coverage
npm run typecheck   # tsc --noEmit — the other half of the CI gate
```

## Layout

Tests live in `__tests__/` folders next to the code they cover and are named
`*.test.ts`. Path aliases (`@/…`) resolve exactly as in the app, configured in
`vitest.config.ts`.

| Area | File | Covers |
|---|---|---|
| Scoring | `src/lib/orchestrator/__tests__/score.test.ts` | `score` weighting/recency decay, `signature` fingerprinting, `dedupe`, `pickWinner` topic-log skipping |
| Serialize | `src/lib/orchestrator/__tests__/serialize.test.ts` | YAML frontmatter round-trips through `gray-matter`; `sanitizeBody` quote-fix |
| Generate | `src/lib/orchestrator/__tests__/generate.test.ts` | `clampMeta`, `slugify`, `normalizeTags`, `extractJson`, and `PostSchema` heal-vs-reject behavior |
| Posts | `src/lib/__tests__/posts.test.ts` | `relatedPosts` ranking (shared tags → category → recency) |
| HTTP | `src/lib/__tests__/http.test.ts` | `fetchWithRetry` timeout/backoff/retry semantics, `fetchJson` |
| Sources | `src/lib/sources/__tests__/*.test.ts` | Exported pure mappers for each wired source — `reddit`, `rss`, `youtube`, `bravenews`, `googletrends`, `lobsters` — covering field mapping, skip rules, caps, and niche filtering |
| MDX guard | `src/lib/orchestrator/__tests__/validate.test.ts` | `validateMdx` accepts well-formed bodies and rejects the real-world break patterns (unclosed `<Cons>`, unterminated `q="…"`, truncated `<FAQ>`) |

## Content validation

Separately from the unit suite, `npm run validate:content` compiles **every**
`content/posts/*.mdx` with the real MDX engine and fails if any is malformed.
It's the safety net behind the in-pipeline `validateMdx` guard and runs in CI via
`.github/workflows/content-check.yml` on content changes.

## Conventions for new tests

- **Test the contract, not the implementation.** Assert observable behavior
  (ordering, healed values, rejection) so refactors don't churn the suite.
- **Keep them pure.** No real `fetch`, no filesystem. Stub `globalThis.fetch`
  with `vi.fn()` when exercising a network helper (see `http.test.ts`).
- **Add a test alongside new pure logic.** New scoring axis, schema transform, or
  source-mapping function → add cases. The CI gate (`typecheck` + `test`) runs on
  every PR via `.github/workflows/test.yml`.
