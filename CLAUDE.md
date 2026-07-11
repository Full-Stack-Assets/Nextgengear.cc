# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## What this is

A **self-hosted, zero-cost auto-blog engine**. A scheduled GitHub Action runs
every hour, gathers stories from seven sources, scores them, researches the
winner, has an LLM write a structured MDX post, and commits it back to the repo.
The Next.js site then auto-deploys (Vercel / Cloudflare Pages).

This particular deployment is **"NextGen Gear"** — a gadgets/consumer-tech niche
site (`nextgengear.cc`). The engine is a reusable template: everything
site-specific lives in **`src/site.config.ts`**. The npm package is still named
`trendblog` (the template's origin name) — don't be confused by the mismatch.

**Steady-state cost: $0** (all sources and the LLM run on free tiers).

## Tech stack

- **Next.js 15** (App Router, React 19) — static-leaning blog, reads MDX from disk
- **TinaCMS 3** — optional visual editor at `/admin`, schema mirrors the pipeline's frontmatter
- **TypeScript** (strict), **Tailwind CSS 3**
- **LLM writer** — OpenAI-compatible endpoint; default **Groq** (`openai/gpt-oss-120b`, with `openai/gpt-oss-20b` as the automatic `llmFallback` on the same key — Gemini was dropped after persistent free-tier 503 "model overloaded" failures), swappable to OpenRouter etc. via `site.config.ts`
- **GitHub Actions** — the hourly scheduler (NOT Vercel cron — Hobby plan caps cron at daily)
- Content is committed as `.mdx` files; there is **no database**.

## Architecture: the generation pipeline

The whole engine lives in `src/lib/orchestrator/`. `pipeline.ts` wires the
stages together with per-stage timings and **graceful fallbacks** — a flaky
source returns `[]` instead of killing the run.

```
sources/* ──▶ score ──▶ dedupe ──▶ pickWinner ──▶ research ──▶ generate ──▶ image ──▶ serialize ──▶ commit
 (7 feeds)   (popularity+engagement+recency)     (Brave+scrape   (LLM, strict   (Pexels/  (MDX+YAML)  (GitHub
                                                  +YT transcripts) zod contract)  Openverse)            Contents API)
```

| Stage | File | Notes |
|---|---|---|
| Gather | `src/lib/sources/*.ts` | reddit, hackernews, devto, rss, youtube, bravenews, googletrends. Each exports `fetchX(): Promise<RawItem[]>`. |
| Score / dedupe / pick | `orchestrator/score.ts` | `score = 0.5·popularity + 0.2·engagement + 0.3·recency`. Dedup by sorted-token title `signature`. |
| Research | `orchestrator/research.ts` | Scrapes winner URL + Brave results (Cheerio) and YouTube transcripts. |
| Generate | `orchestrator/generate.ts` | Calls the LLM, validates against `PostSchema` (zod), retries up to 3×. |
| Image | `orchestrator/image.ts` | Hero image from Pexels / Openverse / none. |
| Serialize | `orchestrator/serialize.ts` | `GeneratedPost` → MDX file with YAML frontmatter. |
| Commit | `orchestrator/github.ts` | Octokit Contents API; also reads/writes `content/.topic-log.json`. |

Shared types are in `orchestrator/types.ts`: `RawItem` → `ScoredItem` →
`ResearchBundle` → `GeneratedPost`, plus `TopicLog`.

### Dedup / topic log

`content/.topic-log.json` records every published post's title `signature`.
`pickWinner` skips any candidate whose signature is already logged. The log is
capped at 500 entries. Concurrent Action runs are reconciled by a **union merge
driver** (`scripts/merge-topic-log.mjs`, wired up via `.gitattributes`) so two
hourly runs appending at once auto-merge instead of conflicting.

## The MDX content contract

Every generated post follows this exact structure, enforced by `SYSTEM_PROMPT`
in `generate.ts` and validated by `PostSchema` (zod):

1. Lead paragraph (3–5 sentences, no heading)
2. `<Callout type="takeaway">` — one-sentence synthesis
3. `## What happened`
4. `## Why it matters`
5. `<ProsCons>` with `<Pros>`/`<Cons>` (3+ `<li>` each)
6. `## How to think about it`
6b. `<BuyBox product="…" />` — *optional*, only for posts centered on a specific buyable product (affiliate CTA → tagged Amazon search link via `src/lib/affiliate.ts`)
7. `<Callout type="warning">` — *optional*, only when warranted
8. `## FAQ` → `<FAQ>` with exactly 3 `<Question q="…">` entries

The components are implemented in `src/components/mdx/index.tsx` (`Callout`,
`ProsCons`, `Pros`, `Cons`, `FAQ`, `Question`, `BuyBox`, exported as `mdxComponents`) and
styled by `.prose-editorial` rules in `src/app/globals.css`. The same shape is
mirrored in the TinaCMS rich-text templates (`tina/config.ts`).

**Frontmatter** (see `serialize.ts` and `PostFrontmatter` in `src/lib/posts.ts`):
`title`, `description`, `date` (ISO), `category`, `tags[]`,
`hero{url,alt,credit,creditUrl}`, `sources[]{title,url}`.

**Self-healing schema:** `PostSchema` *transforms* (clamp/slugify/normalize)
recoverable overshoots instead of throwing; only genuinely unrepairable misses
(too-short body, <2 tags, bad JSON) trigger a retry with the error fed back to
the model. Don't add `.max()` before a transform — it fires first and defeats
the heal.

**MDX compile guard:** after `PostSchema` accepts a post, `generate.ts` runs the
(sanitized) body through the real MDX compiler (`validateMdx` in
`orchestrator/validate.ts`, using `next-mdx-remote`) before committing. A body
that won't compile (unclosed `<Cons>`, unterminated `q="…"`, truncated `<FAQ>`)
feeds the compiler's reason back into the retry loop instead of shipping a post
that breaks the site build. `scripts/validate-content.mjs` (`npm run
validate:content`, and the `content-check.yml` workflow) is the safety net over
already-committed posts.

## Site structure (`src/app/`)

- `page.tsx` — home/listing · `blog/[slug]/page.tsx` — article
- `categories/[category]/`, `tags/[tag]/` — taxonomy listings
- `about/`, `stats/`, `vaporloop/` — static-ish pages
- `api/cron/generate/route.ts` — manual/Vercel-cron trigger for the pipeline (Bearer `CRON_SECRET`)
- `api/subscribe/route.ts` — newsletter signup
- `feed.xml/`, `sitemap.ts`, `robots.ts`, `ads.txt/` — SEO/feeds

`src/lib/posts.ts` reads MDX from `content/posts/`. **Scheduled publishing:** a
post with a future `date` is hidden from all listings until that time (an
unparseable date is treated as published). `relatedPosts()` ranks by shared tags
→ same category → recency.

Other libs: `src/lib/syndicate/` (Bluesky/Mastodon/DEV.to cross-posting),
`src/lib/newsletter/` (Buttondown digest), `src/lib/ads.ts`,
`src/lib/structured-data.ts`.

## Commands

```bash
npm install              # (README says pnpm; npm/yarn work too — Action uses `npm ci`)
cp .env.example .env.local

npm run dev              # tinacms dev wrapper around `next dev` → localhost:3000 (admin at /admin/index.html)
npm run build            # bash scripts/build.sh (Tina cloud build only if creds set, then `next build`)
npm start                # serve the production build
npm run lint             # next lint
npm run typecheck        # tsc --noEmit (CI gate)
npm test                 # vitest run — unit suite over the pipeline's pure logic (CI gate)
npm run test:watch       # vitest in watch mode while developing
npm run validate:content # compile every content/posts/*.mdx (catches malformed posts)

npm run generate -- --dry   # dry run: print the post, write nothing
npm run generate            # real local run: writes content/posts/*.mdx + updates topic log + syndicates
npm run digest              # newsletter weekly digest

npm test                    # Vitest: core-logic unit tests + all-content MDX compile check
npm run test:watch          # watch mode
npm run typecheck           # tsc --noEmit
npm run validate:content    # compile every content/posts/*.mdx (finds build-breaking posts fast)
npm run sanitize            # normalize existing posts' MDX in place (maintenance)
```

`scripts/run-local.ts` is the generation entrypoint the Action calls
(`npx tsx scripts/run-local.ts`). Note it runs the pipeline in `dryRun: true`
mode and writes to disk itself (rather than committing via the GitHub API) — the
Action's own git step does the commit/push.

## Configuration & secrets

- **`src/site.config.ts`** is the single source of truth for branding, audience,
  `categories`/`navCategories`, sources (`subreddits`/`rssFeeds`/`braveQueries`),
  `adsenseClient`, the `llm` endpoint/model/key-env, and `imageProvider`. To
  re-niche or re-brand the site, edit this file (see `CREATE-A-SITE.md`).
- **`.env.example`** lists every env var. Key ones: the LLM key matching
  `llm.apiKeyEnv` (`GROQ_API_KEY` by default), `BRAVE_API_KEY`,
  `PEXELS_API_KEY`, `REDDIT_CLIENT_ID/SECRET`, `GITHUB_TOKEN`/`OWNER`/`REPO`/`BRANCH`,
  `CRON_SECRET`, optional syndication / newsletter / AdSense vars.
- Any unset source/integration is **skipped gracefully**, never fatal.
- Path aliases: `@/*` → `src/*`, `@/content/*` → `content/*`.

## CI / scheduling

- `.github/workflows/generate.yml` — **hourly** (`cron: '0 * * * *'`) + manual
  `workflow_dispatch`. Runs the pipeline, commits new posts to `main`, rebases +
  retries the push (5 attempts) using the topic-log union merge driver, and
  optionally fires `VERCEL_DEPLOY_HOOK_URL`. A `concurrency` group prevents
  overlapping ticks. Add pipeline secrets under repo Settings → Secrets → Actions.
- `.github/workflows/newsletter.yml` — newsletter digest workflow.
- `.github/workflows/test.yml` — **CI gate** on PRs + pushes to `main`: runs
  `npm run typecheck` and `npm test`. Ignores `content/**` so bot post commits
  don't trigger it. See `docs/TESTING.md`.
- `.github/workflows/content-check.yml` — compiles every `content/posts/**` MDX
  file (`npm run validate:content`) on content changes + PRs, so a malformed post
  is caught in CI rather than breaking the Vercel/`next build` prerender.

## Conventions for making changes

- **Never commit secrets.** `.env.local` is gitignored; `.env.example` holds
  placeholders only.
- **Keep the MDX contract in sync.** If you change post structure, update all of:
  `SYSTEM_PROMPT` + `PostSchema` in `generate.ts`, the MDX components in
  `src/components/mdx/index.tsx`, the `.prose-editorial` styles, and the TinaCMS
  rich-text templates in `tina/config.ts`.
- **Adding a source:** create `src/lib/sources/<name>.ts` exporting
  `fetch<Name>(): Promise<RawItem[]>`, add its literal to the `source` union in
  `orchestrator/types.ts`, add it to the `Promise.all` in `pipeline.ts` (wrapped
  in `.catch(() => [])`), and add its weight in `score.ts`'s `SOURCE_WEIGHT`
  (**required** — a missing weight makes `popularity` `NaN`). Factor the
  raw-response → `RawItem[]` mapping into an exported pure function (like
  `lobstersToRawItems` / `toRawItems`) and unit-test it. Niche-agnostic
  aggregators (Hacker News, Lobsters) must self-filter against
  `siteConfig.sources.trendsKeywords` so off-niche stories can't win — see
  `sources/lobsters.ts`.
- **Network calls** should go through `fetchWithRetry` / `fetchJson`
  (`src/lib/http.ts`) for a timeout + bounded backoff on 429/5xx/network blips.
  Callers keep their own `.catch(() => [])` — the helper improves the odds
  before that fallback ever fires.
- **Failure handling philosophy:** sources, syndication, and deploy hooks must
  fail soft (return empty / log a warning) — never abort the run. Only an
  unrecoverable post-generation failure should throw.
- **Add unit tests for new pure logic** (scoring, schema transforms, serialize,
  source mapping) under a `__tests__/` folder — see `docs/TESTING.md`. The CI
  gate (`typecheck` + `test`) runs on every PR.
- **Test generation locally with `--dry` first** so you don't write junk MDX into
  `content/posts/`.
- **Run `npm test` before pushing.** Unit tests live beside the code as
  `*.test.ts` under `src/lib/`; `tests/content-compiles.test.ts` compiles every
  post so a malformed MDX file (which aborts the whole `next build`) is caught in
  CI on the exact file. Add/extend tests when you touch scoring, the writer
  contract, serialization, or affiliate logic. CI (`.github/workflows/ci.yml`)
  gates PRs on typecheck + tests + build. See `docs/testing-and-ci.md`.
- **Guarding content quality:** malformed generated MDX is caught in two places —
  `checkMdxStructure` in `generate.ts` (rejects unbalanced tags → LLM retry) and
  `sanitizeBody` in `serialize.ts` (normalizes recoverable patterns before
  writing). `npm run sanitize` re-runs the latter over the whole catalog.
- Follow the existing code style: strict TypeScript, the file-level comment style
  already present in `orchestrator/*`, and zod for any new structured-output
  validation.

## Git workflow

- The hourly bot commits to `main` as `trendblog-bot`. Human/agent changes should
  go on a feature branch (don't commit straight to `main`) and push with
  `git push -u origin <branch>`.
- Do **not** open a pull request unless explicitly asked.
