// One-shot / maintenance pass that applies the pipeline's `sanitizeBody`
// normalization to every already-committed post. New posts are sanitized at
// generation time (serialize.ts), but posts written before a sanitizer fix — or
// hand-edited ones — can still contain build-breaking MDX (multi-line
// <Question> blocks, stray quotes, leftover "Answer paragraph." placeholders).
//
// Frontmatter is preserved byte-for-byte; only the MDX body is rewritten, and
// only files that actually change are touched. Run with `npm run sanitize`.
import fs from 'node:fs';
import path from 'node:path';
import { sanitizeBody } from '../src/lib/orchestrator/serialize';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');
const FRONTMATTER = /^(---\n[\s\S]*?\n---\n)([\s\S]*)$/;

function run(): void {
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx'));
  let changed = 0;

  for (const file of files) {
    const full = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(full, 'utf8');
    const match = raw.match(FRONTMATTER);
    if (!match) continue;

    const [, frontmatter, body] = match;
    const fixed = sanitizeBody(body);
    if (fixed !== body) {
      fs.writeFileSync(full, frontmatter + fixed);
      changed++;
      console.log(`  fixed  ${file}`);
    }
  }

  console.log(`\nsanitize-content: ${changed} of ${files.length} file(s) rewritten.`);
}

run();
