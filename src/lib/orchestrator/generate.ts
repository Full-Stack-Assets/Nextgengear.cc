import { z } from 'zod';
import type { ResearchBundle, GeneratedPost } from './types';
import { siteConfig } from '@/site.config';

type LlmProvider = { endpoint: string; model: string; apiKeyEnv: string };

// Primary writer model, plus an optional backup provider used when the primary
// keeps returning transient availability errors (5xx / rate limit). The backup
// is configured as `llmFallback` in site.config.ts; skipped when absent or when
// its API key isn't set.
const PRIMARY_LLM: LlmProvider = siteConfig.llm;
const FALLBACK_LLM: LlmProvider | undefined = (siteConfig as { llmFallback?: LlmProvider }).llmFallback;

/** A transient provider error worth failing over to the backup LLM for. */
function isAvailabilityError(msg: string): boolean {
  return /API error (?:429|5\d\d)\b/.test(msg) || /overloaded|unavailable|high demand/i.test(msg);
}

/** How many times to ask the model before giving up on a structurally valid post. */
const MAX_GENERATION_ATTEMPTS = 5;

/** Pause helper for backing off between retries. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

/**
 * Pull the JSON object out of an LLM response. Models intermittently ignore the
 * `response_format: json_object` hint and wrap the object in markdown code
 * fences (```json … ```) or add a prose preamble — a trivially recoverable
 * wrapper that should never burn all three retries. Strip a surrounding fence,
 * and if the result still doesn't parse, fall back to the outermost
 * brace-delimited span. An already-valid response is returned trimmed but
 * otherwise intact (trimming is parse-neutral).
 */
export function extractJson(raw: string): string {
  let s = raw.trim();

  // Strip a single wrapping ```json … ``` (or bare ``` … ```) fence.
  const fenced = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) s = fenced[1].trim();

  // Already valid? Use as-is.
  try {
    JSON.parse(s);
    return s;
  } catch {
    // Otherwise grab the outermost { … } span and let the caller parse it.
    const first = s.indexOf('{');
    const last = s.lastIndexOf('}');
    if (first !== -1 && last > first) return s.slice(first, last + 1);
    return s;
  }
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

6b. <BuyBox product="Exact Product Name" /> — INCLUDE this ONLY when the post centers on a specific, purchasable consumer product (a phone, laptop, headphone, wearable, etc.). Use the product's exact real name as it appears in the research; never invent a model name or number. Place it right after "How to think about it". Omit it entirely for news, rumors, industry analysis, or anything not tied to one buyable product. At most one BuyBox per post.

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
  const primaryKey = process.env[PRIMARY_LLM.apiKeyEnv];
  if (!primaryKey) throw new Error(`${PRIMARY_LLM.apiKeyEnv} not set`);
  const fallbackKey = FALLBACK_LLM ? (process.env[FALLBACK_LLM.apiKeyEnv] ?? '').trim() : '';

  // Start on the primary provider; fail over to the backup on transient errors.
  let provider = PRIMARY_LLM;
  let providerKey = primaryKey;
  let failedOver = false;

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
      content = await callLlm(provider, providerKey, userPrompt);
    } catch (err) {
      // Rate limit / 5xx / network blip — worth another attempt.
      lastError = err instanceof Error ? err.message : String(err);
      // On a transient availability error, fail over to the backup provider
      // (once) and retry immediately against the fresh endpoint.
      if (!failedOver && FALLBACK_LLM && fallbackKey && isAvailabilityError(lastError)) {
        failedOver = true;
        provider = FALLBACK_LLM;
        providerKey = fallbackKey;
        console.warn(`generate: primary LLM (${PRIMARY_LLM.model}) unavailable — failing over to ${FALLBACK_LLM.model}`);
        continue;
      }
      if (attempt < MAX_GENERATION_ATTEMPTS) {
        await sleep(Math.min(30_000, 1000 * 2 ** attempt));
      }
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJson(content));
    } catch {
      lastError = 'response was not valid JSON';
      // Surface a snippet so a recurring failure is diagnosable from CI logs
      // without echoing a full (possibly large) response.
      console.warn(`generate: non-JSON response (attempt ${attempt}): ${content.replace(/\s+/g, ' ').trim().slice(0, 200)}`);
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
    `LLM output failed validation after ${MAX_GENERATION_ATTEMPTS} attempts: ${lastError}`
  );
}

async function callLlm(provider: LlmProvider, key: string, userPrompt: string): Promise<string> {
  const res = await fetch(provider.endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: provider.model,
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
