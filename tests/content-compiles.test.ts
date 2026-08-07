import { describe, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { compile } from '@mdx-js/mdx';

// Regression guard for the whole content catalog. A single malformed post
// (unclosed <Cons>/<Question>, stray tags, bad JSX) fails the production static
// export and takes the entire site down. This compiles every post with the same
// compiler next-mdx-remote uses at build time, so any structurally broken MDX
// fails CI on the exact file — in seconds, and as a set — long before deploy.

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');
const STRIP_FRONTMATTER = /^---\n[\s\S]*?\n---\n([\s\S]*)$/;

const files = fs.existsSync(POSTS_DIR)
  ? fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx'))
  : [];

describe('content posts compile as valid MDX', () => {
  it.each(files)('%s', async (file) => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const body = raw.match(STRIP_FRONTMATTER)?.[1] ?? raw;
    // Throws on structural MDX errors; the file name is the test title so a
    // failure points straight at the offending post.
    await compile(body);
  });
});
