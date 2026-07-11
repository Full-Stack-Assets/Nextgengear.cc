#!/usr/bin/env tsx
/**
 * One-time backfill: 18 evergreen gadget/consumer-tech explainers, each pinned
 * to a specific historical day (spread daily across June 2026) so the catalog
 * doesn't look like it sprang into existence overnight.
 *
 * This repo's pipeline has no topic-seeding entrypoint (no generateForTopic —
 * scripts/seed.ts loops the trend-driven runPipeline instead), so each item
 * synthesizes a "winner" from an explicit evergreen topic string and runs the
 * same stages the pipeline does: research (Brave web search + scrape) →
 * generate (LLM under the strict MDX contract) → pickImage → serialize. The
 * pinned date is applied to the serialized frontmatter (serialize() always
 * stamps "now"; generate() takes no length options, so posts come out at the
 * site's standard length).
 *
 * NEVER commits via Octokit: posts are written to content/posts/ and the local
 * content/.topic-log.json is updated, exactly like seed.ts. The companion
 * workflow (.github/workflows/backfill-articles.yml) commits the result.
 * Idempotent — an item whose signature is already in the log is skipped, and
 * the log is saved after each item, so a partial/interrupted run can simply be
 * re-dispatched.
 *
 * Requires the writer LLM key (`llm.apiKeyEnv` in site.config.ts) and
 * BRAVE_API_KEY (these topics have no source URL, so research relies on web
 * search). PEXELS_API_KEY is optional (hero images).
 *
 * Usage:
 *   npx tsx scripts/backfill-articles.ts         # run the whole batch
 *   npx tsx scripts/backfill-articles.ts --dry   # research+write the first item, write nothing
 */
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { research } from '../src/lib/orchestrator/research';
import { generate } from '../src/lib/orchestrator/generate';
import { pickImage } from '../src/lib/orchestrator/image';
import { serialize } from '../src/lib/orchestrator/serialize';
import { signature } from '../src/lib/orchestrator/score';
import type { ScoredItem, TopicLog } from '../src/lib/orchestrator/types';
import { siteConfig } from '../src/site.config';

const LOG_PATH = path.join(process.cwd(), 'content', '.topic-log.json');
const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

const DELAY_MS = 2000;

interface BackfillItem {
  topic: string;
  date: string; // ISO
}

// Evergreen buying-guide / explainer topics for the gadgets & consumer-tech
// niche — the kind of thing a gear shopper actually searches for. Dates are
// spread one per day across June 2026 at 12:00Z.
const BACKFILL_ITEMS: BackfillItem[] = [
  { topic: 'How to choose a mechanical keyboard: switches, layouts, and build quality', date: '2026-06-01T12:00:00.000Z' },
  { topic: 'USB-C explained: why every cable and charger is not the same', date: '2026-06-02T12:00:00.000Z' },
  { topic: 'Mesh Wi-Fi vs range extenders: which one actually fixes your dead zones', date: '2026-06-03T12:00:00.000Z' },
  { topic: 'OLED vs mini-LED TVs: which display technology is right for you', date: '2026-06-04T12:00:00.000Z' },
  { topic: 'How active noise cancellation works and what to look for in ANC headphones', date: '2026-06-05T12:00:00.000Z' },
  { topic: 'How to pick a portable power bank: capacity, wattage, and airline rules', date: '2026-06-06T12:00:00.000Z' },
  { topic: 'SSD vs HDD: which storage should you buy for speed, capacity, and backups', date: '2026-06-07T12:00:00.000Z' },
  { topic: 'Bluetooth audio codecs explained: SBC, AAC, aptX, and LDAC compared', date: '2026-06-08T12:00:00.000Z' },
  { topic: 'How to choose a smartwatch: sensors, battery life, and ecosystem lock-in', date: '2026-06-09T12:00:00.000Z' },
  { topic: 'Webcam buying guide: resolution, sensor size, and lighting basics', date: '2026-06-10T12:00:00.000Z' },
  { topic: 'Monitor refresh rates explained: what 60Hz, 120Hz, and 240Hz really mean', date: '2026-06-11T12:00:00.000Z' },
  { topic: 'Robot vacuum buying guide: navigation, suction power, and self-emptying docks', date: '2026-06-12T12:00:00.000Z' },
  { topic: 'How to choose a laptop: the specs that actually matter and the ones that do not', date: '2026-06-13T12:00:00.000Z' },
  { topic: 'E-readers explained: e-ink screens, front lights, and supported file formats', date: '2026-06-14T12:00:00.000Z' },
  { topic: 'Wireless charging explained: Qi2, magnetic alignment, and charging speeds', date: '2026-06-15T12:00:00.000Z' },
  { topic: 'Home security cameras: local vs cloud storage and the privacy trade-offs', date: '2026-06-16T12:00:00.000Z' },
  { topic: 'Wi-Fi 6 vs 6E vs Wi-Fi 7: how to pick the right router for your home', date: '2026-06-17T12:00:00.000Z' },
  { topic: 'Action cameras vs smartphones: when a rugged camera is actually worth it', date: '2026-06-18T12:00:00.000Z' },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function loadLocalLog(): Promise<TopicLog> {
  try {
    return JSON.parse(await fs.readFile(LOG_PATH, 'utf8')) as TopicLog;
  } catch {
    return { topics: [] };
  }
}

async function saveLocalLog(log: TopicLog): Promise<void> {
  await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });
  await fs.writeFile(LOG_PATH, JSON.stringify(log, null, 2), 'utf8');
}

/**
 * serialize() always stamps `date:` with "now"; rewrite that one frontmatter
 * line to the pinned historical date. Only touches the frontmatter block, so a
 * `date:` line in the body (unlikely but possible) is never affected.
 */
export function pinDate(mdx: string, iso: string): string {
  const end = mdx.indexOf('\n---', 3);
  if (end === -1) return mdx;
  const head = mdx.slice(0, end).replace(/^date: ".*"$/m, `date: "${iso}"`);
  return head + mdx.slice(end);
}

/**
 * Run the topic through the same stages runPipeline() uses, minus gather/score
 * (the topic is the winner) and minus commit (the workflow's git step commits).
 */
async function generateForBackfillTopic(
  topic: string,
  date: Date
): Promise<{ ok: boolean; slug?: string; mdx?: string; skipped?: string; error?: string }> {
  try {
    const title = topic.trim();

    // A synthetic winner: no source URL, neutral breakdown. research() will
    // Brave-search the title and scrape real articles to back the post.
    const winner: ScoredItem = {
      id: `backfill:${signature(title)}`,
      source: 'bravenews',
      title,
      url: '',
      publishedAt: date.toISOString(),
      score: 1,
      breakdown: { popularity: 0, engagement: 0, recency: 1 },
    };

    const bundle = await research(winner, []);
    if (bundle.articles.length === 0 && bundle.transcripts.length === 0) {
      return { ok: false, skipped: `no research content scrapable for: ${title}` };
    }

    const post = await generate(bundle);
    post.heroImage = await pickImage(post);
    const mdx = pinDate(serialize(post), date.toISOString());

    return { ok: true, slug: post.slug, mdx };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry');

  const llmKeyEnv = siteConfig.llm.apiKeyEnv;
  if (!process.env[llmKeyEnv]?.trim()) {
    console.error(`✗ ${llmKeyEnv} is not set — it's required to write posts. See .env.example.`);
    process.exit(1);
  }
  if (!process.env.BRAVE_API_KEY?.trim()) {
    console.error(
      '✗ BRAVE_API_KEY is not set. These topics have no source URL of their own, ' +
        'so without web search there is nothing to research — every item would be skipped.'
    );
    process.exit(1);
  }

  let log = await loadLocalLog();
  const covered = new Set(log.topics.map((t) => t.signature));
  const queue = BACKFILL_ITEMS.filter((item) => !covered.has(signature(item.topic)));

  console.log(
    `→ ${BACKFILL_ITEMS.length} items in batch, ${queue.length} not yet covered.\n` +
      `→ ${dryRun ? 'DRY RUN (1 item, nothing written)' : `generating ${queue.length}`}…\n`
  );

  if (dryRun) {
    const item = queue[0] ?? BACKFILL_ITEMS[0];
    console.log(`Topic: ${item.topic}\nDate: ${item.date}\n`);
    const res = await generateForBackfillTopic(item.topic, new Date(item.date));
    console.log(JSON.stringify({ ...res, mdx: res.mdx ? `[${res.mdx.length} bytes]` : undefined }, null, 2));
    if (res.mdx) {
      console.log('\n─── MDX preview (first 2000 chars) ───');
      console.log(res.mdx.slice(0, 2000));
    }
    return;
  }

  await fs.mkdir(POSTS_DIR, { recursive: true });
  let written = 0;
  let skipped = 0;

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    process.stdout.write(`[${i + 1}/${queue.length}] ${item.date.slice(0, 10)} — ${item.topic} … `);

    const res = await generateForBackfillTopic(item.topic, new Date(item.date));

    if (!res.ok || !res.slug || !res.mdx) {
      console.log(`skip (${res.skipped ?? res.error ?? 'unknown'})`);
      skipped++;
      if (DELAY_MS > 0) await sleep(DELAY_MS);
      continue;
    }

    await fs.writeFile(path.join(POSTS_DIR, `${res.slug}.mdx`), res.mdx, 'utf8');
    log = {
      topics: [
        ...log.topics,
        {
          slug: res.slug,
          title: item.topic,
          url: '',
          publishedAt: item.date,
          signature: signature(item.topic),
        },
      ],
    };
    await saveLocalLog(log); // save after each so an interrupted run is resumable
    written++;
    console.log(`✓ ${res.slug} (${res.mdx.length} bytes)`);

    if (DELAY_MS > 0 && i < queue.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n✓ Done. Wrote ${written} post(s), skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
