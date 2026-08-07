// Affiliate-link configuration and URL builders.
//
// For a gadget/gear site, affiliate revenue (Amazon Associates et al.) is the
// primary monetization lever. We deliberately build **search** links from a
// product name rather than deep links to a specific ASIN: the writer LLM is
// instructed never to invent identifiers, and a hallucinated ASIN would 404 or
// point at the wrong product. A tagged search URL always resolves, still earns
// commission on whatever the visitor ultimately buys, and needs no product
// database to maintain.
//
// The Associate tag is a (public) account value; set it via env to monetize,
// falling back to the value in site.config.ts. With no tag configured the links
// still render and work — they just aren't attributed (no commission).
import { siteConfig } from '@/site.config';

type AffiliateConfig = { amazonTag?: string };

export const AMAZON_ASSOCIATE_TAG = (
  process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG ||
  (siteConfig as { affiliate?: AffiliateConfig }).affiliate?.amazonTag ||
  ''
).trim();

/** True when at least one affiliate program is configured (drives disclosure copy). */
export const AFFILIATE_ENABLED = AMAZON_ASSOCIATE_TAG.length > 0;

/**
 * Build an Amazon search URL for a product name, appending the Associate tag
 * when one is configured. Always returns a valid, non-404 link.
 */
export function amazonSearchUrl(product: string): string {
  const q = encodeURIComponent(product.trim());
  const tag = AMAZON_ASSOCIATE_TAG ? `&tag=${encodeURIComponent(AMAZON_ASSOCIATE_TAG)}` : '';
  return `https://www.amazon.com/s?k=${q}${tag}`;
}

/** Short, FTC-compliant disclosure shown alongside affiliate links. */
export const AFFILIATE_DISCLOSURE = `${siteConfig.name} may earn a commission when you buy through links on this page, at no extra cost to you.`;

// Categories whose posts are about buyable products and so warrant a contextual
// "shop this" affiliate link in the article template. News/rumor/analysis
// categories are excluded — a search link there would be irrelevant (and reads
// as spam to both readers and Amazon's compliance review).
const SHOPPABLE_CATEGORIES = new Set(['reviews', 'audio', 'mobile', 'wearables', 'smarthome']);

export function isShoppableCategory(category: string): boolean {
  return SHOPPABLE_CATEGORIES.has(category.trim().toLowerCase());
}
