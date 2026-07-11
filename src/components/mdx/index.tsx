import type { ReactNode } from 'react';
import { amazonSearchUrl, AFFILIATE_DISCLOSURE } from '@/lib/affiliate';

type CalloutType = 'takeaway' | 'warning' | 'note';

const CALLOUT_CONFIG: Record<CalloutType, { label: string; bg: string; border: string; accent: string }> = {
  takeaway: { label: 'Takeaway', bg: 'bg-accent/[0.06]', border: 'border-accent', accent: 'text-accent-deep' },
  warning:  { label: 'Watch out', bg: 'bg-amber-50', border: 'border-amber-500', accent: 'text-amber-700' },
  note:     { label: 'Note', bg: 'bg-surface', border: 'border-rule', accent: 'text-muted' },
};

export function Callout({ type = 'note', children }: { type?: CalloutType; children: ReactNode }) {
  const c = CALLOUT_CONFIG[type];
  return (
    <aside className={`my-8 rounded-xl border-l-4 ${c.border} ${c.bg} pl-5 pr-5 py-4`}>
      <div className={`mb-1 text-[10px] font-bold uppercase tracking-[0.2em] ${c.accent}`}>
        {c.label}
      </div>
      <div className="font-display text-lg font-medium leading-snug text-ink">{children}</div>
    </aside>
  );
}

export function ProsCons({ children }: { children: ReactNode }) {
  return (
    <div className="my-10 grid gap-0 overflow-hidden rounded-xl border border-rule bg-white shadow-card sm:grid-cols-2">
      {children}
    </div>
  );
}

export function Pros({ children }: { children: ReactNode }) {
  return (
    <div className="border-t-4 border-emerald-500 bg-emerald-50/40 p-6 sm:border-r sm:border-r-rule">
      <div className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-emerald-700">
        <span className="text-lg leading-none">+</span> Pros
      </div>
      <ul className="space-y-2 text-base">{children}</ul>
    </div>
  );
}

export function Cons({ children }: { children: ReactNode }) {
  return (
    <div className="border-t-4 border-rose-500 bg-rose-50/40 p-6">
      <div className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-rose-700">
        <span className="text-lg leading-none">–</span> Cons
      </div>
      <ul className="space-y-2 text-base">{children}</ul>
    </div>
  );
}

export function FAQ({ children }: { children: ReactNode }) {
  return (
    <div className="my-10 divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-white shadow-card">
      {children}
    </div>
  );
}

export function Question({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group px-5 py-5 transition-colors open:bg-surface/60">
      <summary className="flex cursor-pointer items-start justify-between gap-4 list-none">
        <span className="font-display text-lg font-semibold leading-snug">{q}</span>
        <span className="mt-1 shrink-0 text-accent font-mono text-xl leading-none transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="mt-3 text-[16px] leading-relaxed text-ink/85">{children}</div>
    </details>
  );
}

/**
 * A product call-to-action with an affiliate link. `product` is the exact name
 * the writer mentions; the link is an Amazon search for that name (never a
 * hallucinated ASIN), tagged with the configured Associate id. `query` lets the
 * author override the search terms. An FTC disclosure is shown inline, before
 * the link, so it is clear and conspicuous.
 */
export function BuyBox({
  product,
  query,
  cta = 'Check price on Amazon',
}: {
  product: string;
  query?: string;
  cta?: string;
}) {
  if (!product) return null;
  const href = amazonSearchUrl(query || product);
  return (
    <aside className="my-10 rounded-xl border border-accent/30 bg-gradient-to-br from-accent/[0.06] to-accent/[0.02] p-6 shadow-card">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent-deep">
        Where to buy
      </div>
      <div className="font-display text-lg font-semibold leading-snug">{product}</div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored nofollow"
        className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white no-underline shadow-card transition-colors hover:bg-accent-deep"
      >
        {cta} →
      </a>
      <p className="mt-3 text-xs leading-relaxed text-ink/55">{AFFILIATE_DISCLOSURE}</p>
    </aside>
  );
}

export const mdxComponents = {
  Callout,
  ProsCons,
  Pros,
  Cons,
  FAQ,
  Question,
  BuyBox,
};
