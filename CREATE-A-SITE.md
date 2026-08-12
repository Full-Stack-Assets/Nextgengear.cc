# Create a new niche site from this template

This repository contains a reusable static publication engine. Site-specific
behavior lives primarily in `src/site.config.ts`; automated content generation
runs in GitHub Actions, and the production build publishes through GitHub Pages.

## 1. Create the repository

Use **Use this template → Create a new repository** in GitHub, or fork the
repository when preserving upstream history is useful.

## 2. Configure the site

Edit `src/site.config.ts`:

- **Branding:** `name`, `tagline`, `description`, `url`, and `footerNote`.
- **Audience:** the phrase used by the writer to judge relevance.
- **Taxonomy:** `categories` and `navCategories`.
- **Sources:** subreddits, RSS feeds, search queries, and trend keywords.
- **Writer:** the OpenAI-compatible endpoint, model, fallback, and API-key
  environment variable.
- **Images:** `pexels`, `openverse`, or `none`.
- **Revenue:** optional AdSense and affiliate configuration.

For a basic niche site, no application code changes are required.

## 3. Configure GitHub Pages and the domain

1. Open **Settings → Pages** in the new repository.
2. Set the source to **GitHub Actions**.
3. Update the repository `CNAME` file to the production domain, or remove it
   when using the default Pages address.
4. Configure the DNS records shown in the Pages settings screen.
5. Set `NEXT_PUBLIC_SITE_URL` in the Pages build environment when the value
   should override `src/site.config.ts`.

`.github/workflows/pages.yml` builds the static export, verifies the expected
files, and publishes `out/` after each accepted change to `main`.

## 4. Configure generation secrets

Under **Settings → Secrets and variables → Actions**, add the credentials used
by the selected providers:

- the text-generation key named by `llm.apiKeyEnv` in `site.config.ts`;
- `BRAVE_API_KEY` when Brave research is enabled;
- `PEXELS_API_KEY` when Pexels images are enabled;
- `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` when Reddit is enabled; and
- any optional newsletter or syndication credentials you intentionally use.

Openverse requires no image key. Unconfigured optional sources are skipped.
The generator writes content inside the Actions checkout and pushes with the
repository-scoped workflow token, so no external deployment hook is required.

## 5. Verify locally

```bash
npm install
cp .env.example .env.local
npm run typecheck
npm test
npm run validate:content
npm run build
```

Preview the static output:

```bash
npx --yes serve out
```

## 6. Launch generation

The production generator lives in `.github/workflows/generate.yml`. It runs on
its configured schedule and supports manual dispatch. Trigger the first run from
**Actions → Validated Content Generation → Run workflow**.

Generated content is accepted only after type checking, full MDX validation,
tests, and the complete site build succeed. The resulting commit then triggers
the Pages publishing workflow.

For a larger initial catalog, run **Seed Posts** with a conservative count and
review the generated content before increasing volume.

## Operating notes

- Each site needs its own advertising approval and publisher identifiers.
- Shared provider keys are allowed, but stagger schedules to avoid free-tier
  rate limits across multiple sites.
- Future-dated article frontmatter remains hidden until its publication date.
- Keep the prompt, zod schema, MDX components, styles, and Tina templates in
  sync whenever the article contract changes.
- Preserve the `CNAME` and static-export verification when customizing the
  publishing workflow.
