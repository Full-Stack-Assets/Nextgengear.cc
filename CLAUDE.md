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
- **LLM writer** — OpenAI-compatible endpoint; default **Google Gemini** (`gemini-2.5-flash` — a stable GA model; the `gemini-flash-latest` alias was returning 503 "model is overloaded" under free-tier load), swappable to Groq / OpenRouter via `site.config.ts`
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

npm run generate -- --dry   # dry run: print the post, write nothing
npm run generate            # real local run: writes content/posts/*.mdx + updates topic log + syndicates
npm run digest              # newsletter weekly digest
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
  `llm.apiKeyEnv` (`GEMINI_API_KEY` by default), `BRAVE_API_KEY`,
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

## Conventions for making changes

- **Never commit secrets.** `.env.local` is gitignored; `.env.example` holds
  placeholders only.
- **Keep the MDX contract in sync.** If you change post structure, update all of:
  `SYSTEM_PROMPT` + `PostSchema` in `generate.ts`, the MDX components in
  `src/components/mdx/index.tsx`, the `.prose-editorial` styles, and the TinaCMS
  rich-text templates in `tina/config.ts`.
- **Adding a source:** create `src/lib/sources/<name>.ts` exporting
  `fetch<Name>(): Promise<RawItem[]>`, add it to the `Promise.all` in
  `pipeline.ts` (wrapped in `.catch(() => [])`), and add its weight in
  `score.ts`.
- **Failure handling philosophy:** sources, syndication, and deploy hooks must
  fail soft (return empty / log a warning) — never abort the run. Only an
  unrecoverable post-generation failure should throw.
- **Test generation locally with `--dry` first** so you don't write junk MDX into
  `content/posts/`.
- Follow the existing code style: strict TypeScript, the file-level comment style
  already present in `orchestrator/*`, and zod for any new structured-output
  validation.

## Git workflow

- The hourly bot commits to `main` as `trendblog-bot`. Human/agent changes should
  go on a feature branch (don't commit straight to `main`) and push with
  `git push -u origin <branch>`.
- Do **not** open a pull request unless explicitly asked.
