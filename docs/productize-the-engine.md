# Productizing the engine — what the offer looks like

The codebase is, by design, a **reusable template**: everything site-specific
lives in `src/site.config.ts`, and re-niching is a documented operation
(`CREATE-A-SITE.md`). NextGen Gear is one deployment of it. That makes the
engine itself — not just this site — a sellable product. This sketches what
that offer could be.

## What the engine actually is

A self-hosted, **$0-running-cost auto-blog engine**: hourly GitHub Action →
7 free sources → score/dedupe → research → LLM writer (strict MDX contract) →
image → commit → auto-deploy. Plus syndication, newsletter digest, SEO/JSON-LD,
TinaCMS editing, and (now) an affiliate + ad monetization layer.

The differentiator vs. generic "AI blog" SaaS: **no recurring infra cost, no
per-post fees, owns its content as plain MDX in git, and is fully
self-hostable.** The buyer owns the asset outright.

## Three ways to package it

### 1. Self-serve template ("DIY")
Sell the repo as a one-time purchase with `CREATE-A-SITE.md`, a setup wizard,
and a config generator.

- **Price**: one-time $149–399 (à la premium themes / boilerplates).
- **Channel**: Gumroad / Lemon Squeezy, a landing page, ProductHunt launch.
- **Cost to deliver**: ~zero marginal; support is the cost.
- **Best for**: developers who want to own the stack.

### 2. Done-for-you niche sites ("Managed")
You stand up and operate a site in the buyer's niche; they pay monthly.

- **Price**: $99–499/mo per site (setup fee + management).
- **Margin**: high — the engine runs on free tiers; your cost is the LLM key
  (often still free-tier) and a few minutes of oversight per site.
- **Best for**: affiliate marketers / local-business owners who want the asset
  but not the ops. The monetization layer in this branch is the upsell.

### 3. Hosted multi-tenant SaaS ("Platform")
A dashboard where a user picks a niche, connects keys, and gets a running
auto-blog. The current single-tenant engine becomes the per-tenant worker.

- **Price**: $29–99/mo tiered by post frequency / sites.
- **Build cost**: real — needs multi-tenancy, billing, key vaulting, an
  onboarding UI, and abstracting the per-deploy env/secrets into per-tenant
  config. This is the biggest lift and the biggest ceiling.
- **Best for**: scale, but only worth it after 1 and 2 validate demand.

## Recommended path

Ladder it: **(1) template to validate the market and seed testimonials →
(2) done-for-you to capture buyers who won't self-host and to prove the
monetization upsell → (3) SaaS only once there's a waitlist.** Each rung funds
the next and de-risks the platform build.

## What to build to make it sellable

- **One-command init**: a wizard that writes `site.config.ts` + `.env.local`
  from a few prompts (niche, sources, branding, keys).
- **Niche source packs**: ready-made `sources` blocks (the gadget pack here is
  the reference) so a buyer doesn't curate subreddits/RSS by hand.
- **Monetization presets**: AdSense + Amazon tag fields surfaced in the wizard
  (the affiliate/ad plumbing already exists).
- **A live demo + "fork in 5 minutes" video** — this is the actual sales asset.

## Honest risks to price in

- **Ad-network / AI-content policy risk** (see the on-site disclosures): the
  product must ship with disclosure defaults and quality guidance, or buyers get
  their AdSense/Amazon accounts banned and blame the tool.
- **LLM free-tier limits**: at scale (many tenants), "free" stops being free —
  the SaaS tier needs a cost model around the LLM provider.
- **Search/platform dependency**: an auto-blog's traffic depends on Google's
  stance on AI content; the offer should lead with affiliate/owned-audience
  monetization, which is more durable than display ads on programmatic traffic.
