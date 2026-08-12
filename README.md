# NextGenGear.cc

NextGenGear is a self-hosted, zero-cost trend publication. A scheduled GitHub
Actions workflow gathers candidates from configured sources, scores and
researches them, generates a structured MDX draft, validates the result, and
commits approved output back to the repository. A separate GitHub Pages
workflow builds and publishes the static site at `nextgengear.cc`.

**Core stack:** Next.js 15 · React 19 · TinaCMS · TypeScript · Tailwind CSS ·
GitHub Actions · GitHub Pages · Groq-compatible text generation · Brave Search ·
Pexels/Openverse · GitHub Contents API.

## Architecture

```text
sources → score → deduplicate → select → research → generate → validate → serialize → commit
                                                                         ↓
                                                              GitHub Pages build
```

The generation engine lives under `src/lib/orchestrator/`. Each stage is a
separate module, and `pipeline.ts` combines the stages with bounded retries,
timings, and graceful fallbacks. A source that is temporarily unavailable is
skipped instead of aborting the entire run.

Content is stored as MDX under `content/posts/`; there is no production
database. The topic log at `content/.topic-log.json` prevents duplicate stories
and is reconciled with a custom union merge driver during automated pushes.

## Local setup

### Prerequisites

- Node.js 20 or newer
- npm, pnpm, or yarn
- optional API credentials for the sources and publishing integrations you use

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The Tina editor is available at
`http://localhost:3000/admin/index.html` when its local development wrapper is
running.

### Generate content

```bash
# Dry run: generate and print without writing content.
npm run generate -- --dry

# Write a generated post and update the topic log.
npm run generate
```

## Configuration

`src/site.config.ts` is the primary source of truth for:

- site name, tagline, production URL, and footer copy;
- categories and navigation;
- subreddit, RSS, search, and trend inputs;
- text-generation endpoint, model, fallback, and API-key variable;
- image provider; and
- optional advertising and affiliate settings.

`.env.example` documents all supported environment variables. Unset optional
sources and integrations are skipped. Never commit `.env.local` or real API
keys.

### Common credentials

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` | Default text-generation provider and fallback. |
| `OPENROUTER_API_KEY` | Optional alternate OpenAI-compatible provider. |
| `BRAVE_API_KEY` | Optional research and news search. |
| `PEXELS_API_KEY` | Optional image provider when configured. |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | Optional Reddit source. |
| `GITHUB_TOKEN` | Optional Contents API publishing outside the local Actions writer. |

The production GitHub Actions generator writes files locally and pushes them
with its repository-scoped token; it does not require a separate deploy hook.

## Automated generation

`.github/workflows/generate.yml` runs the validated production pipeline daily
and also supports manual dispatch. It:

1. installs locked dependencies;
2. generates candidate content;
3. detects whether `content/` changed;
4. runs type checking, MDX validation, tests, and a complete build;
5. commits the validated content; and
6. rebases and retries the push if another run updated the branch first.

Bulk bootstrapping is handled by `.github/workflows/seed.yml`. The seed workflow
uses the same local-write-and-push model and relies on the normal Pages workflow
to publish the resulting commit.

## Publishing with GitHub Pages

`.github/workflows/pages.yml` is the production publishing path. On changes to
`main`, it runs the static build, verifies `out/index.html` and `out/CNAME`,
uploads the `out/` artifact, and deploys it through GitHub Pages.

The repository includes a `CNAME` file for `nextgengear.cc`. In repository
settings, Pages must use **GitHub Actions** as its source. DNS should point the
custom domain at GitHub Pages according to the records shown in the repository
Pages settings.

For a local production check:

```bash
npm run build
npx --yes serve out
```

## TinaCMS editor

The schema in `tina/config.ts` matches the frontmatter and rich-text structures
emitted by the generator.

```bash
npm run dev
```

Local filesystem editing works without hosted editor credentials. For remote
contributors, configure `NEXT_PUBLIC_TINA_CLIENT_ID` and `TINA_TOKEN` in the
build environment.

## MDX contract

Every generated article follows this structure:

1. a lead paragraph;
2. a takeaway callout;
3. `## What happened`;
4. `## Why it matters`;
5. a `ProsCons` block with at least three items per side;
6. `## How to think about it`;
7. an optional warning or product block when warranted; and
8. an FAQ containing exactly three questions.

The prompt and zod schema enforce the contract. `validateMdx` then compiles the
body with the same MDX engine used by the application before any content is
written. `scripts/validate-content.mjs` provides a second pass over every
committed article.

## Scoring and duplicate prevention

The default scoring formula is:

```text
score = 0.5 × popularity + 0.2 × engagement + 0.3 × recency
```

Popularity is normalized per source, engagement is capped, and recency decays
with a 24-hour half-life. A sorted-token signature collapses equivalent title
wordings, while the topic log prevents already-covered candidates from winning.

## Optional monetization

### Google AdSense

Set `NEXT_PUBLIC_ADSENSE_CLIENT` to enable the site-wide script, publisher
verification metadata, generated `ads.txt`, consent handling, and configured ad
slots. Ad-unit variables are optional when Auto ads are enabled.

### Amazon Associates

Set `NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG` to add the configured tracking tag to
eligible product links and `BuyBox` components.

### Newsletter and syndication

Buttondown, Bluesky, Mastodon, and DEV Community integrations are optional.
Each remains inert until its corresponding variables are configured.

## Testing

```bash
npm run typecheck
npm test
npm run validate:content
npm run build
```

The CI workflows validate TypeScript, unit tests, all committed MDX, and the
complete static export. A malformed article therefore fails on its exact file
before it can reach the production branch.

## Troubleshooting

**No items from any source** — one or more external sources may be unavailable.
The run logs show which adapters were skipped.

**All top candidates already covered** — every high-scoring candidate already
exists in the topic log. Wait for new stories or intentionally adjust the log.

**No research content scrapable** — the winner and backup results could not be
retrieved. The pipeline exits safely and can be run again later.

**Text-generation rate limit** — provider free tiers reset on their own cadence.
Avoid repeated manual runs in a short period.

**Pages build fails** — run the four testing commands above, then inspect the
Pages workflow’s build step and the first malformed MDX file it reports.

## Extending

- Add sources under `src/lib/sources/` and register their weights and pipeline
  invocation.
- Change tone and output constraints in `src/lib/orchestrator/generate.ts`.
- Change the niche through `src/site.config.ts` source queries and categories.
- Change the publishing cadence in `.github/workflows/generate.yml`.
- Keep prompt, schema, components, styles, and Tina templates synchronized when
  changing the MDX contract.

## License

MIT.
