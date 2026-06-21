import type { Post } from '../posts';
import { SITE_URL, SITE_NAME } from '../structured-data';

/** Assemble a markdown digest email from a set of posts (most recent first). */
export function buildDigest(posts: Post[]): { subject: string; body: string } {
  const subject =
    posts.length === 1
      ? `${SITE_NAME}: ${posts[0].frontmatter.title}`
      : `${SITE_NAME}: ${posts.length} stories worth your time`;

  const items = posts
    .map(
      (p) =>
        `## [${p.frontmatter.title}](${SITE_URL}/blog/${p.slug})\n\n${p.frontmatter.description}\n`
    )
    .join('\n');

  const body = `Here's what shipped recently on ${SITE_NAME}:\n\n${items}\n---\n\nRead everything at ${SITE_URL}\n`;
  return { subject, body };
}
