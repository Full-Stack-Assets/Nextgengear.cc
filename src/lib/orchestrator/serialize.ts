import type { GeneratedPost } from './types';

/**
 * Serialize a GeneratedPost into a complete MDX file with YAML frontmatter.
 * The shape matches the TinaCMS schema in tina/config.ts.
 */
export function serialize(post: GeneratedPost): string {
  const fm = {
    title: post.title,
    description: post.description,
    date: new Date().toISOString(),
    category: post.category,
    tags: post.tags,
    hero: {
      url: post.heroImage.url,
      alt: post.heroImage.alt,
      credit: post.heroImage.credit,
      creditUrl: post.heroImage.creditUrl,
    },
    sources: post.sources,
  };

  const yaml = toYaml(fm);
  return `---\n${yaml}---\n\n${sanitizeBody(post.body).trim()}\n`;
}

/**
 * Make the LLM-written MDX body safe to prerender. A single malformed post
 * fails the whole static export (next-mdx-remote throws at build), so we defend
 * against the recurring failure modes the model produces:
 *
 *  1. Unescaped double quotes inside a <Question q="..."> attribute
 *     (e.g. q="the "limited" plan") — swap the inner quotes for single quotes.
 *  2. A <Question> answer split across indented lines, and/or a leftover
 *     "Answer paragraph." template placeholder — both break MDX because the
 *     element's children stop being simple inline text. Collapse the answer to
 *     a single line and strip the placeholder.
 *
 * Each transform is a no-op on already-well-formed input.
 */
export function sanitizeBody(body: string): string {
  // 1. Escape stray double quotes inside the q="..." attribute.
  let out = body.replace(
    /(<Question\s+q=")([^\n]*?)(">)/g,
    (_match, open: string, question: string, close: string) =>
      `${open}${question.replace(/"/g, "'")}${close}`
  );

  // 2. Normalize each <Question> element's inner content to a single, clean line.
  out = out.replace(
    /(<Question\b[^>]*>)([\s\S]*?)(<\/Question>)/g,
    (_match, open: string, inner: string, close: string) => {
      const cleaned = inner
        .replace(/\s+/g, ' ')
        .replace(/^\s*Answer paragraph\.?\s*/i, '')
        .trim();
      return `${open}${cleaned}${close}`;
    }
  );

  return out;
}

function toYaml(obj: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (obj === null || obj === undefined) return 'null';

  if (typeof obj === 'string') return quoteIfNeeded(obj);
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return (
      '\n' +
      obj
        .map((item) => {
          if (typeof item === 'object' && item !== null) {
            const entries = Object.entries(item as Record<string, unknown>);
            const first = entries[0];
            const rest = entries.slice(1);
            const firstLine = `${pad}- ${first[0]}: ${toYaml(first[1], indent + 1)}`;
            const restLines = rest
              .map(([k, v]) => `${pad}  ${k}: ${toYaml(v, indent + 1)}`)
              .join('\n');
            return restLines ? `${firstLine}\n${restLines}` : firstLine;
          }
          return `${pad}- ${toYaml(item, indent + 1)}`;
        })
        .join('\n')
    );
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    if (indent === 0) {
      return entries.map(([k, v]) => `${k}: ${toYaml(v, indent + 1)}`).join('\n') + '\n';
    }
    return (
      '\n' +
      entries.map(([k, v]) => `${pad}${k}: ${toYaml(v, indent + 1)}`).join('\n')
    );
  }

  return '';
}

function quoteIfNeeded(s: string): string {
  // Always quote for safety — dates, colons, leading dashes, etc. all need it
  const escaped = s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}
