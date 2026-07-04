#!/usr/bin/env tsx
/**
 * One-time backfill: 18 long-form (roughly double-length) evergreen articles,
 * each dated to a specific historical day that had zero or only one post —
 * smoothing out the lopsided posting history. Gap analysis (computed from
 * content/posts/*.mdx frontmatter on 2026-07-04, over the 2026-04-17 to
 * 2026-07-04 publishing window): 5 real zero-post days (2026-04-18, 04-24,
 * 04-26, 05-17, 06-23) plus 13 one-post days spread evenly across the rest of
 * the range (mid-June onward already has multi-post days from later seed/hourly
 * bursts, so this batch focuses on the sparser April-mid-June stretch).
 *
 * Each entry uses the same generateForTopic() path as scripts/seed.ts (real
 * Brave-search research + a real LLM author), just with `targetWords` /
 * `minBodyChars` set so the body comes out roughly double the site's usual
 * ~4,800-char median instead of the standard length.
 *
 * NEVER commits via Octokit: posts are written to content/posts/ and the local
 * content/.topic-log.json is updated, exactly like seed.ts. The companion
 * workflow (.github/workflows/backfill-articles.yml) commits the result.
 * Idempotent — an item whose signature is already in the log is skipped, so a
 * partial/interrupted run can simply be re-dispatched.
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
import { generateForTopic } from '../src/lib/orchestrator/pipeline';
import { signature } from '../src/lib/orchestrator/score';
import type { TopicLog } from '../src/lib/orchestrator/types';
import { siteConfig } from '../src/site.config';

const LOG_PATH = path.join(process.cwd(), 'content', '.topic-log.json');
const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

// Long-form target: the site's body currently runs ~4,800 chars / ~800-850
// words at the median. Aim the prompt at roughly double that, and enforce a
// floor above standard (but below the exact target, since LLM word counts
// vary) so a short response is rejected and retried rather than shipped.
const TARGET_WORDS = 1700;
const MIN_BODY_CHARS = 7500;

const DELAY_MS = 2000;

interface BackfillItem {
  topic: string;
  date: string; // ISO
}

// Chronological. Each date is a day that had 0 or 1 posts in the published
// history (computed from content/posts/*.mdx frontmatter on 2026-07-04); the
// five 04-18/04-24/04-26/05-17/06-23 entries are the real zero-post days, the
// rest are evenly spread one-post days across the sparser April-June stretch.
const BACKFILL_ITEMS: BackfillItem[] = [
  { topic: 'How OLED and LCD displays differ and which is better for you', date: '2026-04-17T12:00:00.000Z' },
  { topic: 'What smartphone camera specs actually mean: megapixels, sensors, and aperture explained', date: '2026-04-18T12:00:00.000Z' },
  { topic: 'Wi-Fi 6 vs Wi-Fi 7: what the new wireless standards actually change', date: '2026-04-22T12:00:00.000Z' },
  { topic: 'How wireless earbuds noise cancellation actually works', date: '2026-04-24T12:00:00.000Z' },
  { topic: 'USB-C explained: charging speeds, data standards, and compatibility', date: '2026-04-26T12:00:00.000Z' },
  { topic: 'What is a smart home hub and do you actually need one', date: '2026-04-29T12:00:00.000Z' },
  { topic: 'How to choose the right laptop processor: Intel, AMD, and Apple Silicon compared', date: '2026-05-03T12:00:00.000Z' },
  { topic: 'SSD vs HDD storage explained and why it matters for speed', date: '2026-05-07T12:00:00.000Z' },
  { topic: 'What makes a smartwatch accurate: sensors and health tracking explained', date: '2026-05-12T12:00:00.000Z' },
  { topic: 'How graphics cards work and what specs actually matter for gaming', date: '2026-05-16T12:00:00.000Z' },
  { topic: 'Bluetooth codecs explained: why audio quality varies between earbuds', date: '2026-05-17T12:00:00.000Z' },
  { topic: "What is fast charging and is it safe for your phone's battery", date: '2026-05-21T12:00:00.000Z' },
  { topic: 'How to extend the battery life of your gadgets: myths and facts', date: '2026-05-26T12:00:00.000Z' },
  { topic: 'Matter and smart home standards: what they mean for device compatibility', date: '2026-05-30T12:00:00.000Z' },
  { topic: 'Understanding display refresh rates: why 120Hz screens feel smoother', date: '2026-06-03T12:00:00.000Z' },
  { topic: 'What is RAM and how much do you actually need in a laptop or phone', date: '2026-06-09T12:00:00.000Z' },
  { topic: "How wireless charging works and why it's slower than wired", date: '2026-06-13T12:00:00.000Z' },
  { topic: "Foldable phones explained: durability, hinges, and whether they're worth it", date: '2026-06-23T12:00:00.000Z' },
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
      `→ Long-form target: ~${TARGET_WORDS} words, ${MIN_BODY_CHARS}+ body chars.\n` +
      `→ ${dryRun ? 'DRY RUN (1 item, nothing written)' : `generating ${queue.length}`}…\n`
  );

  if (dryRun) {
    const item = queue[0] ?? BACKFILL_ITEMS[0];
    console.log(`Topic: ${item.topic}\nDate: ${item.date}\n`);
    const res = await generateForTopic(item.topic, {
      dryRun: true,
      date: new Date(item.date),
      targetWords: TARGET_WORDS,
      minBodyChars: MIN_BODY_CHARS,
    });
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

    const res = await generateForTopic(item.topic, {
      dryRun: true,
      date: new Date(item.date),
      targetWords: TARGET_WORDS,
      minBodyChars: MIN_BODY_CHARS,
    });

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
