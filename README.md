# Wire and Logic

A self-hosted, zero-cost trend blog. A scheduled job runs every hour, picks the highest-signal story from seven sources, researches it, writes a structured MDX post, and commits it to GitHub. The Next.js site auto-deploys.

**Stack:** Next.js 15 · TinaCMS · Groq (free tier) · Brave Search · Pexels · GitHub Contents API · Vercel/Cloudflare.

**Monthly cost at steady state:** $0.

---

## How it works

```
 ┌─ Reddit ─┐
 │ HN      │
 │ DEV.to  │──▶ score ──▶ dedup ──▶ winner ──▶ research ──▶ Groq ──▶ MDX ──▶ git commit ──▶ deploy
 │ RSS     │   (pop + engagement + recency)    (Brave + scrape     (strict JSON
 │ YouTube │                                    + YT transcripts)   contract)
 └─ Brave ─┘
```

Each stage is its own module in `src/lib/orchestrator/` and can be tested independently. The `pipeline.ts` runner wires them together with per-stage timings and graceful fallbacks — a flaky source doesn't kill the run.

---

## Setup

### 1. Prereqs

- Node 20+
- `pnpm` (or npm/yarn — adjust commands accordingly)
- A GitHub repo to commit posts into (can be this same repo)

### 2. Install

```bash
pnpm install
cp .env.example .env.local
```

### 3. Get the free API keys

| Key | Where | Free tier |
|---|---|---|
| `GROQ_API_KEY` | https://console.groq.com/keys | Generous rate limits, ~30 RPM on llama-3.3-70b |
| `BRAVE_API_KEY` | https://api.search.brave.com/app/keys | 2,000 queries/month on the free plan |
| `PEXELS_API_KEY` | https://www.pexels.com/api/new/ | Unlimited for dev use |
| `GITHUB_TOKEN` | github.com → Settings → Developer settings → Fine-grained PAT | Scope: **Contents: Read/Write** on the blog repo only |
| `CRON_SECRET` | `openssl rand -hex 32` | — |

Fill them into `.env.local` along with `GITHUB_OWNER` / `GITHUB_REPO` / `GITHUB_BRANCH`.

> **⚠️ Security Note:** Never commit `.env.local` or any file containing real API keys to version control. The `.env.local` file is already in `.gitignore` to prevent accidental commits. Always use `.env.example` as a template with placeholder values only.

### 4. Test locally

```bash
# Dry run — prints the generated post, doesn't write anything
pnpm generate --dry

# Real run — writes MDX to content/posts/ and updates content/.topic-log.json
pnpm generate

# Start the dev server
pnpm dev
```

Open http://localhost:3000. The seed post is visible out of the box; new posts show up as soon as `pnpm generate` writes them.

---

## Deploy

### Scheduling — GitHub Actions (the hourly tick)

The hourly schedule lives in **`.github/workflows/generate.yml`**, which runs at the top of every hour (`cron: '0 * * * *'`), executes the pipeline with `npx tsx scripts/run-local.ts`, and commits any new post straight to the repo. No serverless CPU limits, free logs, and the push triggers your host to redeploy. This is the scheduler — your host below is just for serving the site.

Add the pipeline secrets (`GROQ_API_KEY`, `BRAVE_API_KEY`, `PEXELS_API_KEY`, `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`) under **Settings → Secrets and variables → Actions**. The workflow has `contents: write` and a `concurrency` group so a slow run never overlaps the next tick. Use the **Run workflow** button (`workflow_dispatch`) to trigger a one-off run.

> **Why not a Vercel cron?** Vercel's Hobby (free) plan caps cron jobs at **once per day**, so an hourly tick there would be rejected or throttled. To stay at $0, scheduling lives in GitHub Actions. On Vercel **Pro** you can instead add an hourly entry back into `vercel.json` (`{ "path": "/api/cron/generate", "schedule": "0 * * * *" }`) — the route already handles `Authorization: Bearer $CRON_SECRET`. Don't run both at once or you'll generate twice an hour.

### Hosting — Vercel (easiest)

1. Push this repo to GitHub.
2. Import the repo into Vercel.
3. Add every env var from `.env.local` to the Vercel project.

Vercel auto-deploys on every push, so each hourly commit from the Action redeploys the site. That's it.

### Hosting — Cloudflare Pages (zero-cost route)

Deploy the Next.js blog to Pages purely as the static host — it's free and fast, and it redeploys on each push from the Action. Pages Functions have a **~30s CPU limit per request** and this pipeline runs 30–90s end-to-end, so don't try to run the pipeline inside a Pages Function; let the GitHub Action do the generation.

### Self-host

`pnpm build && pnpm start` and point a reverse proxy at port 3000. The GitHub Action still drives generation; to trigger a run by hand, hit the route with `curl`:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/generate
```

---

## TinaCMS editor (optional)

The schema in `tina/config.ts` matches the frontmatter the pipeline emits. Start the editor with:

```bash
pnpm dev   # Tina runs alongside Next via the `tinacms dev` wrapper
```

Then visit http://localhost:3000/admin/index.html. You can fix typos, tweak tags, or hand-write posts that follow the same structure.

**Self-hosted mode (default):** TinaCMS works in local filesystem mode without any cloud credentials. The build script (`scripts/build.sh`) automatically handles this by setting placeholder values during build if credentials aren't provided.

**Hosted editing:** For non-local contributors, sign up at tina.io for the free tier and fill in `NEXT_PUBLIC_TINA_CLIENT_ID` + `TINA_TOKEN` in your deployment environment variables. These are optional for local development.

---

## The MDX contract

Every generated post follows this exact shape — the system prompt in `src/lib/orchestrator/generate.ts` enforces it, and the zod schema validates the JSON before writing:

1. **Lead paragraph** (no heading, 3–5 sentences)
2. `<Callout type="takeaway">` — one-sentence synthesis
3. `## What happened`
4. `## Why it matters`
5. `<ProsCons>` block with 3+ items per side
6. `## How to think about it`
7. `<Callout type="warning">` — *optional*, only if warranted
8. `## FAQ` with exactly 3 `<Question>` entries

All components are implemented in `src/components/mdx/index.tsx` and styled via `globals.css`'s `.prose-editorial` rules.

---

## Scoring

From `src/lib/orchestrator/score.ts`:

```
score = 0.5·popularity + 0.2·engagement + 0.3·recency
```

- **popularity** — log-scaled upvotes, normalized per-source, then weighted by source (HN=1.0, Reddit=0.85, Brave=0.9, Google Trends=0.8, DEV=0.75, RSS=0.7, YT=0.6). Google Trends maps each trending search's approximate traffic to the "upvotes" axis and is filtered to tech/AI/business terms so the blog stays on-niche.
- **engagement** — comments-to-upvotes ratio (capped at 1.0)
- **recency** — exponential decay with a **24h half-life**

Dedup uses a sorted-token fingerprint of the title, so "GPT-5 released today" and "Today: GPT-5 is out" collapse to the same signature. The topic log (`content/.topic-log.json`) is checked on every run and capped at 500 entries.

---

## Monetization

Two revenue layers ship with the engine; both are off until you configure them.

### Display ads — Google AdSense

Set `NEXT_PUBLIC_ADSENSE_CLIENT` (or `adsenseClient` in `site.config.ts`) to your
publisher id. That single value:

- loads the AdSense script site-wide (so **Auto ads** work once you enable them in
  the AdSense dashboard under **Ads → By site**),
- emits the `google-adsense-account` verification meta tag, and
- **serves `/ads.txt` automatically** — the route at `src/app/ads.txt/route.ts`
  derives the required line (`google.com, pub-…, DIRECT, f08c47fec0942fa0`) from
  the publisher id, so you never hand-maintain the file. Verify it's live at
  `https://<your-domain>/ads.txt` after deploy; AdSense will warn if it can't find it.

For manual ad units, also set `NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE` and
`NEXT_PUBLIC_ADSENSE_SLOT_FOOTER` to your ad-unit ids.

> **Heads-up:** this is AI-generated content. AdSense reviews against a
> "scaled content" policy and may reject or hold approval — the disclosures on
> `/about` and per post are there to help, but approval isn't guaranteed.

### Affiliate links — Amazon Associates

Set `NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG` (or `affiliate.amazonTag` in
`site.config.ts`). `<BuyBox>` blocks and the category-gated "Shop this" links then
carry your tag. See `src/lib/affiliate.ts`.

### Consent (EU/UK)

A lightweight consent banner (`src/components/ConsentBanner.tsx`) wires **Google
Consent Mode v2** — ad/analytics storage default to *denied* until the visitor
accepts. For full EEA/UK compliance Google still requires a **certified CMP**;
the built-in banner is a sensible default, not a substitute for one.

---

## Troubleshooting

**"no items from any source"** — all six sources failed. Usually a network blip; check logs. Try `pnpm generate --dry` after a minute.

**"all top candidates already covered"** — the scorer found winners, but every one has a signature that's already in the topic log. Either wait for new stories or delete recent entries from `content/.topic-log.json`.

**"no research content scrapable"** — the winner's URL and all three Brave results failed to scrape (timeouts, 403s, JS-only pages). The pipeline skips gracefully; try again next tick.

**Groq rate limit** — the free tier resets every minute. One post/hour stays comfortably under the limit, but if you're iterating locally, just wait a minute.

**Cloudflare Pages timeouts** — see Option B above. Pages Functions can't run this pipeline end-to-end.

---

## Extending

- **Add a source:** drop a new file in `src/lib/sources/`, export a function returning `RawItem[]`, and add it to the `Promise.all` in `pipeline.ts`.
- **Tune the tone:** edit `SYSTEM_PROMPT` in `generate.ts`. The zod schema will catch anything structurally broken.
- **Change the niche:** adjust `SUBREDDITS` in `reddit.ts`, `BRAVE_QUERIES` in `bravenews.ts`, and `DEFAULT_FEEDS` in `rss.ts`.
- **Change the cadence:** edit the `cron` in `.github/workflows/generate.yml` (e.g. `0 */2 * * *` for every two hours, `0 12 * * *` for daily). For multiple posts per tick, call `runPipeline()` in a loop with different category filters.

---

## License

MIT — do whatever you want with it.
