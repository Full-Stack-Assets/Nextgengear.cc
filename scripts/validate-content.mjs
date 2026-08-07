#!/usr/bin/env node
/**
 * Validate that every committed post compiles as MDX — the safety net behind the
 * in-pipeline `validateMdx` guard. Runs the exact compiler the site builds with
 * (`next-mdx-remote`) over `content/posts/*.mdx` and exits non-zero if any post
 * fails, with a compact per-file reason.
 *
 *   npm run validate:content
 *
 * Wired into CI (.github/workflows/content-check.yml) so a malformed post is
 * surfaced immediately instead of only blowing up the Vercel/`next build`
 * prerender. Deliberately dependency-light (no TS, no aliases) so it runs with a
 * bare `node`.
 */
import { serialize } from 'next-mdx-remote/serialize';
import matter from 'gray-matter';
import fs from 'node:fs';
import path from 'node:path';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

async function main() {
  let files;
  try {
    files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx'));
  } catch {
    console.log('validate-content: no content/posts directory — nothing to check.');
    return;
  }

  const broken = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
    let content;
    try {
      content = matter(raw).content;
    } catch (err) {
      broken.push([file, `frontmatter: ${firstLine(err)}`]);
      continue;
    }
    try {
      await serialize(content, { parseFrontmatter: false });
    } catch (err) {
      broken.push([file, firstLine(err)]);
    }
  }

  console.log(`validate-content: scanned ${files.length} post(s), ${broken.length} broken.`);
  if (broken.length > 0) {
    for (const [file, reason] of broken) {
      console.error(`  ✗ ${file}\n      ${reason}`);
    }
    process.exit(1);
  }
}

function firstLine(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l && !/^\[?next-mdx-remote\]?/i.test(l) && !l.startsWith('error compiling MDX')) ||
    msg.split('\n')[0]
  ).slice(0, 300);
}

main().catch((err) => {
  console.error('validate-content: unexpected failure:', err);
  process.exit(1);
});
