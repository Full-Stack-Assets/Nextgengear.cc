import { z } from 'zod';
import type { ResearchBundle, GeneratedPost } from './types';
import { siteConfig } from '@/site.config';

const LLM_URL = siteConfig.llm.endpoint;
const LLM_MODEL = siteConfig.llm.model;
const LLM_KEY_ENV = siteConfig.llm.apiKeyEnv;

/** How many times to ask the model before giving up on a structurally valid post. */
const MAX_GENERATION_ATTEMPTS = 3;

/**
 * Collapse whitespace and truncate to at most `max` chars at a word boundary,
 * appending an ellipsis. Used as a schema transform so an over-long field is
 * healed in place instead of throwing — the LLM reliably overshoots length
 * caps, and one overshoot must never kill the run after research has succeeded.
 */
export function clampMeta(s: string, max = 200): string {
  const t = s.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > 0 ? cut.slice(0, sp) : cut).trimEnd() + '…';
}

/** Coerce any string into a kebab-case slug matching /^[a-z0-9-]+$/. */
export function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/** Lowercase, trim, drop blanks/duplicates, and cap at 6. */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  return tags
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0 && !seen.has(t) && (seen.add(t), true))
    .slice(0, 6);
}

// Self-healing contract. Length/shape overshoots that can be safely coerced are
// repaired by transforms (so a too-long description or a messy slug never throws
// — note `.max()` would fire *before* a transform, so it's deliberately gone).
// Constraints that can't be met without inventing content (a too-short body, or
// fewer than two real tags) still fail and drive a retry rather than be faked.
export const PostSchema = z.object({
  title: z.string().min(20).transform((s) => clampMeta(s, 120)),
  description: z.string().min(1).transform((s) => clampMeta(s)),
  slug: z.string().transform(slugify).pipe(z.string().regex(/^[a-z0-9-]+$/)),
  category: z.string().transform((s) => s.trim().toLowerCase()),
  tags: z
    .array(z.string())
    .transform(normalizeTags)
    .pipe(z.array(z.string()).min(2).max(6)),
  body: z.string().min(800),
});

const SYSTEM_PROMPT = `You are a senior writer producing a single blog post in MDX format for ${siteConfig.audience}.

Your output MUST be a valid JSON object with exactly these fields — nothing else, no prose, no code fences:
{
  "title": string,                // 60-100 chars, specific and concrete, no clickbait
  "description": string,          // SEO meta description, 1-2 sentences, at most 150 chars
  "slug": string,                 // kebab-case, <= 60 chars
  "category": string,             // one of: ${siteConfig.categories.map((c) => `"${c}"`).join(', ')}
  "tags": string[],               // 2-6 lowercase tags
  "body": string                  // MDX body (see structural rules below)
}

BODY STRUCTURE (mandatory, in this order):

1. Opening paragraph (3-5 sentences) — hook + what happened + why it matters. No heading.

2. <Callout type="takeaway"> … </Callout> — a single sentence synthesizing the core point.

3. ## What happened
   Two or three tight paragraphs of factual reporting from the research.

4. ## Why it matters
   Analysis — stakes, implications, who's affected.

5. <ProsCons>
     <Pros>
       <li>…</li>
       <li>…</li>
       <li>…</li>
     </Pros>
     <Cons>
       <li>…</li>
       <li>…</li>
       <li>…</li>
     </Cons>
   </ProsCons>

6. ## How to think about it
   Practical guidance or a framework. Prose only.

7. <Callout type="warning"> … </Callout> — IF there are meaningful caveats, risks, or things the reader should NOT do. Omit this block if nothing warrants a warning.

8. ## FAQ
   <FAQ>
     <Question q="…">Answer paragraph.</Question>
     <Question q="…">Answer paragraph.</Question>
     <Question q="…">Answer paragraph.</Question>
   </FAQ>
   Exactly 3 questions, each a real question a reader would ask.

HARD RULES:
- Write the SEO meta description as 1-2 sentences, at most 150 characters. Do not exceed 150 characters.
- Never invent quotes or attribute statements to people.
- Never invent specific numbers. If you cite a number, it must appear in the research.
- Do not paraphrase any single source closely — synthesize across sources.
- No filler like "in today's fast-paced world" or "in conclusion".
- No emoji.
- American English.
- Do not wrap the JSON in markdown code fences.`;

export async function generate(bundle: ResearchBundle): Promise<GeneratedPost> {
  const key = process.env[LLM_KEY_ENV];
  if (!key) throw new Error(`${LLM_KEY_ENV} not set`);

  const baseUserPrompt = buildUserPrompt(bundle);
  let lastError = '';

  // PostSchema heals the clampable overshoots on its own. Retry only covers the
  // genuinely unrepairable misses (too-short body, too-few tags, malformed JSON)
  // and transient Groq errors, feeding the exact reason back so the model can
  // correct itself. Only fail loudly after exhausting attempts.
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const userPrompt =
      attempt === 1
        ? baseUserPrompt
        : `${baseUserPrompt}\n\nYour previous response was rejected: ${lastError}\nReturn a corrected JSON object that satisfies every constraint exactly.`;

    let content: string;
    try {
      content = await callLlm(key, userPrompt);
    } catch (err) {
      // Rate limit / 5xx / network blip — worth another attempt.
      lastError = err instanceof Error ? err.message : String(err);
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      lastError = 'response was not valid JSON';
      continue;
    }

    const result = PostSchema.safeParse(parsed);
    if (result.success) {
      return finalize(result.data, bundle);
    }
    lastError = result.error.issues
      .map((i) => `${i.path.join('.') || 'root'} — ${i.message}`)
      .join('; ');
  }

  throw new Error(
    `Groq output failed validation after ${MAX_GENERATION_ATTEMPTS} attempts: ${lastError}`
  );
}

async function callLlm(key: string, userPrompt: string): Promise<string> {
  const res = await fetch(LLM_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      temperature: 0.5,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM API error ${res.status}: ${text.slice(0, 500)}`);
  }

  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return json.choices[0]?.message?.content ?? '';
}

function finalize(validated: z.infer<typeof PostSchema>, bundle: ResearchBundle): GeneratedPost {
  const sources = [
    { title: bundle.winner.title, url: bundle.winner.url },
    ...bundle.articles.map((a) => ({ title: a.title, url: a.url })),
    ...bundle.transcripts.map((t) => ({
      title: `${t.title} (video)`,
      url: `https://www.youtube.com/watch?v=${t.videoId}`,
    })),
  ];

  return {
    ...validated,
    heroImage: { url: '', alt: '', credit: '', creditUrl: '' }, // populated by image stage
    sources,
  };
}

function buildUserPrompt(bundle: ResearchBundle): string {
  const { winner, articles, transcripts, related } = bundle;

  const articleBlock = articles
    .map(
      (a, i) => `### Source ${i + 1}: ${a.title}
URL: ${a.url}
${a.content.slice(0, 4000)}`
    )
    .join('\n\n');

  const transcriptBlock = transcripts.length
    ? '\n\n## Video transcripts\n' +
      transcripts
        .map((t) => `### ${t.title}\n${t.text.slice(0, 3000)}`)
        .join('\n\n')
    : '';

  const relatedBlock = related.length
    ? '\n\n## Related headlines (for context only, do not quote)\n' +
      related.map((r) => `- ${r.title} (${r.source})`).join('\n')
    : '';

  return `# Topic
**Winner headline**: ${winner.title}
**Source**: ${winner.source}
**URL**: ${winner.url}
**Published**: ${winner.publishedAt}

## Primary research
${articleBlock}
${transcriptBlock}
${relatedBlock}

Produce the JSON object now.`;
}
