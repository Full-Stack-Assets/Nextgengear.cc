import type { GeneratedPost } from './types';
import { siteConfig, type ImageProvider } from '@/site.config';

type Hero = GeneratedPost['heroImage'];

interface PexelsPhoto {
  photographer: string;
  photographer_url: string;
  alt: string;
  src: { large2x: string };
}
interface PexelsResponse {
  photos: PexelsPhoto[];
}

interface OpenverseResult {
  url: string;
  title?: string;
  creator?: string;
  creator_url?: string;
  foreign_landing_url?: string;
}
interface OpenverseResponse {
  results?: OpenverseResult[];
}

/**
 * Pick a banner image for a post. Provider is set in site.config.ts:
 *   'pexels'    — best quality, needs PEXELS_API_KEY (falls back to Openverse)
 *   'openverse' — keyless, commercial-licensed open media
 *   'none'      — no hero image
 * Any failure degrades to a keyless source, then to no image.
 */
export async function pickImage(post: GeneratedPost): Promise<Hero> {
  // The `as const` config gives imageProvider a literal type; assert to the
  // union so the branches below type-check. This still catches a bad provider
  // string at compile time (asserting a non-member literal is a TS error).
  const provider = siteConfig.imageProvider as ImageProvider;
  if (provider === 'none') return emptyHero();

  const query = buildQuery(post);

  if (provider === 'pexels' && process.env.PEXELS_API_KEY) {
    const fromPexels = await pexels(post, query).catch((e) => {
      console.warn('[image] pexels failed, falling back:', e);
      return null;
    });
    if (fromPexels) return fromPexels;
  }

  const fromOpenverse = await openverse(post, query).catch((e) => {
    console.warn('[image] openverse failed:', e);
    return null;
  });
  return fromOpenverse ?? emptyHero();
}

function buildQuery(post: GeneratedPost): string {
  const terms = [...post.tags, post.category].filter(
    (t) => !['news', 'opinion', 'tech', 'technology'].includes(t.toLowerCase())
  );
  return (terms[0] ?? post.tags[0] ?? post.category ?? 'news').replace(/-/g, ' ');
}

function emptyHero(): Hero {
  return { url: '', alt: '', credit: '', creditUrl: '' };
}

async function pexels(post: GeneratedPost, query: string): Promise<Hero | null> {
  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('size', 'large');
  url.searchParams.set('per_page', '15');

  const res = await fetch(url, { headers: { authorization: process.env.PEXELS_API_KEY as string } });
  if (!res.ok) return null;
  const json = (await res.json()) as PexelsResponse;
  if (!json.photos?.length) return null;

  const photo = json.photos[Math.abs(hashCode(post.slug)) % Math.min(5, json.photos.length)];
  return {
    url: photo.src.large2x,
    alt: photo.alt || post.title,
    credit: photo.photographer,
    creditUrl: photo.photographer_url,
  };
}

async function openverse(post: GeneratedPost, query: string): Promise<Hero | null> {
  const url = new URL('https://api.openverse.org/v1/images/');
  url.searchParams.set('q', query);
  url.searchParams.set('license_type', 'commercial');
  url.searchParams.set('aspect_ratio', 'wide');
  url.searchParams.set('page_size', '15');

  const res = await fetch(url, {
    headers: { 'user-agent': `${siteConfig.name.replace(/\s+/g, '')}/1.0 (+${siteConfig.url})` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as OpenverseResponse;
  const results = json.results ?? [];
  if (!results.length) return null;

  const r = results[Math.abs(hashCode(post.slug)) % Math.min(5, results.length)];
  return {
    url: r.url,
    alt: r.title || post.title,
    credit: r.creator || 'Openverse',
    creditUrl: r.foreign_landing_url || r.creator_url || 'https://openverse.org',
  };
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}
