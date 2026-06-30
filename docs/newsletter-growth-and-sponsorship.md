# Newsletter growth + sponsorship plan

A concrete, staged plan to turn the Buttondown list into a monetizable asset.
The engine already publishes ~hourly and cross-posts; the newsletter is the one
owned channel that compounds and that sponsors will pay for.

## Where we are

- **Capture**: footer signup (site-wide) + an end-of-article CTA on every post
  (added in this branch). Honeypot + rate-limited `/api/subscribe`.
- **Send**: weekly digest via Buttondown (`src/lib/newsletter/digest.ts`,
  `npm run digest`).
- **Gap**: no growth loop, no segmentation, no sponsorship inventory.

## Phase 1 — Grow to 1,000 subscribers (foundation)

Goal: prove the capture funnel and get to a list size worth pitching.

1. **Lead magnet.** Replace the generic "weekly dispatch" promise with a
   specific hook tied to the niche, e.g. *"The 5 gadgets worth your money this
   week — and the 3 to skip."* Specific, opinionated, scarce.
2. **Inline mid-article CTA.** We have footer + end-of-post. Add one soft inline
   prompt after the `## Why it matters` section on long posts (highest scroll
   depth). Keep it text-only, not a box, to avoid CTA fatigue.
3. **Exit-intent / sticky bar** on desktop only, dismissible, 1×/session.
4. **Double opt-in + welcome email** that immediately delivers value (links to 3
   best evergreen posts) — sets open-rate expectations and warms deliverability.
5. **Source the list from owned traffic first**: every syndication post
   (Bluesky/Mastodon/DEV.to) and the RSS feed footer should link the signup.

KPI to watch: **signup rate per 1,000 sessions** (target 1–2%) and
**confirmed-open rate** (target >40%).

## Phase 2 — 1,000 → 5,000 (the sponsorship threshold)

Most tech-newsletter sponsors want **≥2,000–5,000 engaged subscribers** before
they'll pay. Tactics:

1. **Referral loop.** Buttondown supports referral tracking; add a "share this"
   block to the digest with a 3-referral reward (e.g. a curated "best of"
   buyer's guide PDF). This is the single biggest organic lever.
2. **Cross-promotion swaps** with similarly-sized gadget/tech newsletters
   (recommend each other in one send). Free, high-intent.
3. **Content upgrades**: gate one premium roundup per month behind signup.
4. **SEO → email**: the new `/best/[category]` hub pages are high-intent landing
   pages — put a category-specific CTA on each ("Get our weekly audio picks").

## Phase 3 — Monetize

Once engaged subscribers clear ~2k, run all three in parallel:

| Model | How | Rough economics |
|---|---|---|
| **Classified / primary sponsor** | One ad slot per send, sold by the issue | Tech lists charge ~$20–40 CPM; a 5k list at 45% open ≈ 2,250 impressions ≈ $45–90/send to start, rising with list size |
| **Affiliate in-email** | Feature 1–2 products per digest using the same tagged Amazon links as the site | Converts well because the audience is purchase-minded |
| **Self-promotion** | Drive subscribers to the highest-affiliate-value `/best/*` hubs | Compounds the on-site affiliate work |

**Inventory to build**: a one-page media kit (list size, open rate, CTR,
audience description, ad spec + price). Use marketplaces like Paved or
Swapstack to find sponsors once you have the kit.

## Operational notes

- Keep send cadence weekly until open rate is stable; daily burns lists fast.
- Track UTM tags on every in-email link so sponsor reporting is credible.
- Never sell more than one sponsor slot per send early on — protects open rates,
  which is the metric sponsors actually buy.
- Disclosure: sponsored content must be labeled; affiliate links in-email need
  the same FTC disclosure used on the site.
