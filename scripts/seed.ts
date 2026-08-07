#!/usr/bin/env tsx
/**
 * Bulk seed runner — generates multiple unique posts in one session.
 *
 * Each iteration runs the full pipeline (gather → score → research → generate
 * → image → serialize), writes MDX to content/posts/, and appends to the local
 * topic log so later iterations skip already-covered stories.
 *
 * Usage:
 *   npx tsx scripts/seed.ts              # generate 30 posts (default)
 *   npx tsx scripts/seed.ts --count=10   # generate 10 posts
 *   npx tsx scripts/seed.ts --dry        # dry run, print first success only
 *
 * Skips (no research, all topics covered, etc.) do not count toward --count.
 * Stops after --max-attempts pipeline runs (default: count × 4).
 */
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { runPipeline } from '../src/lib/orchestrator/pipeline';
import type { TopicLog } from '../src/lib/orchestrator/types';
import { signature } from '../src/lib/orchestrator/score';
import { syndicate } from '../src/lib/syndicate';

const LOG_PATH = path.join(process.cwd(), 'content', '.topic-log.json');
const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

function parseArg(name: string, fallback: number): number {
  const flag = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!flag) return fallback;
  const n = Number(flag.split('=')[1]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const TARGET = parseArg('count', 30);
const MAX_ATTEMPTS = parseArg('max-attempts', TARGET * 4);
const DRY = process.argv.includes('--dry');
const PAUSE_MS = 5_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function loadLocalLog(): Promise<TopicLog> {
  try {
    const raw = await fs.readFile(LOG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { topics: [] };
  }
}

async function saveLocalLog(log: TopicLog): Promise<void> {
  await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });
  await fs.writeFile(LOG_PATH, JSON.stringify(log, null, 2), 'utf8');
}

async function main() {
  const topicLog = await loadLocalLog();
  let generated = 0;
  let attempts = 0;
  let skipped = 0;
  let failed = 0;

  console.log(
    `→ Seed run: target=${TARGET} maxAttempts=${MAX_ATTEMPTS} dry=${DRY} existingLog=${topicLog.topics.length}\n`
  );

  await fs.mkdir(POSTS_DIR, { recursive: true });

  while (generated < TARGET && attempts < MAX_ATTEMPTS) {
    attempts++;
    console.log(`\n─── Attempt ${attempts}/${MAX_ATTEMPTS} (${generated}/${TARGET} written) ───`);

    const result = await runPipeline({ dryRun: true, topicLog });

    if (!result.ok) {
      if (result.skipped) {
        skipped++;
        console.log(`⊘ Skipped: ${result.skipped}`);
      } else {
        failed++;
        console.error(`✗ Failed: ${result.error ?? 'unknown error'}`);
      }
      await sleep(PAUSE_MS);
      continue;
    }

    if (!result.slug || !result.mdx) {
      skipped++;
      console.log('⊘ Skipped: pipeline returned ok but no MDX');
      await sleep(PAUSE_MS);
      continue;
    }

    if (DRY) {
      console.log('\n─── DRY RUN — first successful post preview (2000 chars) ───');
      console.log(result.mdx.slice(0, 2000));
      console.log(`\nWinner: ${result.winner?.title} (score ${result.winner?.score})`);
      break;
    }

    const filePath = path.join(POSTS_DIR, `${result.slug}.mdx`);
    await fs.writeFile(filePath, result.mdx, 'utf8');
    generated++;
    console.log(`✓ Wrote ${filePath}`);

    if (result.winner) {
      topicLog.topics.push({
        slug: result.slug,
        title: result.winner.title,
        url: result.winner.url,
        publishedAt: new Date().toISOString(),
        signature: signature(result.winner.title),
      });
      await saveLocalLog(topicLog);
      console.log(`✓ Topic log → ${topicLog.topics.length} entries`);
    }

    try {
      const { data, content } = matter(result.mdx);
      const results = await syndicate({
        slug: result.slug,
        title: String(data.title ?? ''),
        description: String(data.description ?? ''),
        body: content,
        tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
      });
      console.log(`✓ Syndication — ${results.map((r) => `${r.platform}:${r.status}`).join('  ')}`);
    } catch (err) {
      console.warn('Syndication failed (non-fatal):', err instanceof Error ? err.message : err);
    }

    await sleep(PAUSE_MS);
  }

  console.log(
    `\n─── Seed summary ───\n` +
      `  generated: ${generated}/${TARGET}\n` +
      `  attempts:  ${attempts}\n` +
      `  skipped:   ${skipped}\n` +
      `  failed:    ${failed}\n` +
      `  dry:       ${DRY}`
  );

  if (!DRY && generated < TARGET) {
    console.warn(`\n⚠ Only ${generated}/${TARGET} posts written before stopping.`);
    process.exit(generated === 0 ? 1 : 0);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
