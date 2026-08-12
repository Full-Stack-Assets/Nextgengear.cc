# Repository guide

Guidance for humans and coding agents working on NextGenGear.

## Product and deployment model

NextGenGear is a static Next.js publication backed by repository content. A
scheduled GitHub Actions workflow gathers and ranks stories, researches a
winner, generates MDX, validates it, and commits it to the production branch.
The GitHub Pages workflow creates and publishes the static export.

The production domain is `nextgengear.cc`, represented by the repository
`CNAME` file. There is no production database and no server-side scheduler.
Documentation and code must not assume request-time server functions are
available on the static host.

## Stack

- Next.js 15, React 19, and strict TypeScript
- Tailwind CSS 3
- TinaCMS for optional local or hosted editing
- MDX files under `content/posts/`
- GitHub Actions for generation, validation, and publishing
- OpenAI-compatible text-generation providers selected in `src/site.config.ts`
- optional Brave, Reddit, Pexels, Openverse, newsletter, syndication, ads, and
  affiliate integrations

Unset optional integrations must fail soft. Do not add mandatory credentials to
the static publishing path unless the underlying feature is required to render
the site.

## Generation architecture

`src/lib/orchestrator/pipeline.ts` combines independent stages:

```text
sources → score → deduplicate → select → research → generate → image → validate → serialize
```

Key modules:

| Stage | Location | Contract |
|---|---|---|
| Sources | `src/lib/sources/*.ts` | Return `RawItem[]`; unavailable sources return an empty set. |
| Scoring | `src/lib/orchestrator/score.ts` | Normalize popularity, engagement, recency, and source weight. |
| Research | `src/lib/orchestrator/research.ts` | Retrieve and summarize source material with bounded retries. |
| Generation | `src/lib/orchestrator/generate.ts` | Produce strict structured output and retry recoverable failures. |
| Images | `src/lib/orchestrator/image.ts` | Use the configured provider or omit imagery safely. |
| Validation | `src/lib/orchestrator/validate.ts` | Compile MDX before content is accepted. |
| Serialization | `src/lib/orchestrator/serialize.ts` | Write canonical frontmatter and MDX. |
| Repository IO | `src/lib/orchestrator/github.ts` | Optional Contents API path for external publishing contexts. |

The production Actions runner uses `scripts/run-local.ts`, writes generated
files into its checkout, validates them, and commits through git. Do not add a
second deployment trigger to that push; the Pages workflow already publishes
accepted commits.

## Duplicate prevention

`content/.topic-log.json` stores title signatures for published topics. The log
is capped, and `.gitattributes` wires `scripts/merge-topic-log.mjs` as a union
merge driver so concurrent automated updates can be reconciled during rebase.

Any workflow that commits generated content must configure that merge driver
before rebasing.

## MDX contract

Generated bodies must contain:

1. a lead paragraph;
2. a takeaway callout;
3. `## What happened`;
4. `## Why it matters`;
5. a balanced `ProsCons` structure with three or more items per side;
6. `## How to think about it`;
7. optional warning or product content only when justified; and
8. an FAQ with exactly three questions.

Keep these surfaces synchronized when changing the contract:

- `SYSTEM_PROMPT` and `PostSchema` in `generate.ts`;
- MDX components in `src/components/mdx/index.tsx`;
- article styles in `src/app/globals.css`;
- Tina rich-text templates in `tina/config.ts`;
- structural and compiler tests; and
- any sanitizer behavior in `serialize.ts` or `scripts/sanitize-content.ts`.

Schema transforms intentionally repair bounded formatting overshoots. Do not
insert restrictive validators before a transform when that would prevent the
repair from running.

## Source changes

When adding a source:

1. create `src/lib/sources/<source>.ts`;
2. export an adapter returning `RawItem[]`;
3. add the source literal to the shared type union;
4. register the source in the pipeline with a local fallback;
5. add a weight in `SOURCE_WEIGHT`;
6. apply niche filtering to general-purpose aggregators; and
7. unit-test the raw-response mapping as pure logic.

Network calls should use the repository HTTP helpers for timeouts and bounded
backoff. Source adapters must still handle exhaustion by returning an empty
collection.

## Site structure

Important routes and modules:

- `src/app/page.tsx` — home listing
- `src/app/blog/[slug]/page.tsx` — article page
- `src/app/categories/` and `src/app/tags/` — taxonomy listings
- `src/app/about/` and `src/app/stats/` — informational pages
- `src/app/feed.xml/`, `sitemap.ts`, `robots.ts`, and `ads.txt/` — static
  discovery and monetization files
- `src/lib/posts.ts` — MDX loading, scheduled visibility, and related content
- `src/lib/syndicate/` — optional cross-posting
- `src/lib/newsletter/` — optional digest and subscription integration

Do not document routes that are not present in the tree. This is a static Pages
application; new request-time API routes require an explicit, separately hosted
runtime and must not be represented as part of the current production surface.

## Configuration

`src/site.config.ts` owns branding, audience, taxonomy, source queries, provider
selection, image behavior, and optional revenue settings. `.env.example`
documents supported variables without real values.

Core development commands:

```bash
npm install
cp .env.example .env.local
npm run dev
npm run typecheck
npm test
npm run validate:content
npm run build
```

Generation commands:

```bash
npm run generate -- --dry
npm run generate
npm run seed
npm run digest
npm run sanitize
```

## Workflows

- `.github/workflows/generate.yml` — scheduled and manual validated generation;
  change detection, type checking, content validation, tests, full build,
  commit, rebase, and push.
- `.github/workflows/seed.yml` — bulk content bootstrap with the same repository
  write model.
- `.github/workflows/pages.yml` — static build verification and GitHub Pages
  publishing.
- `.github/workflows/ci.yml` and `.github/workflows/test.yml` — code gates.
- `.github/workflows/content-check.yml` — all-content MDX compilation.
- `.github/workflows/newsletter.yml` — optional digest.

Workflows that reference `steps.<id>.outputs` must define that step `id` and
write the output to `$GITHUB_OUTPUT`. Shell commands must live inside an
explicit `run` block; malformed indentation can make an otherwise sensible
workflow unavailable.

## Change discipline

- Work on a feature branch; do not bypass review for code changes.
- Never commit secrets or populated local environment files.
- Run type checking, tests, content validation, and a complete build before
  merge.
- Add or update tests when changing scoring, schemas, source adapters,
  serialization, affiliate behavior, or the MDX contract.
- Prefer source-specific fixes over suppressing a failing gate.
- Preserve human editorial accountability and source citation requirements.
- Keep optional integration failures non-fatal unless the user explicitly
  promotes that integration to a required production dependency.
