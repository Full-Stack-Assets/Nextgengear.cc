// Split an MDX post body into two halves so a mid-article ad unit can be
// rendered between them — mid-content placements are the highest-earning
// in-article position, and the post-body slot alone leaves that on the table.
//
// The MDX contract guarantees a `## How to think about it` section boundary
// where no component wraps across; we split there. Belt-and-braces: only split
// when every contract component's open/close tags balance in the first half,
// so a contract-violating post (or a future contract change) degrades to the
// current single-render behavior instead of producing two unparseable halves.

const SPLIT_MARKER = /\n(?=## How to think about it\b)/;

const CONTRACT_COMPONENTS = ['ProsCons', 'Pros', 'Cons', 'FAQ', 'Question', 'Callout', 'BuyBox'];

function tagsBalanced(mdx: string): boolean {
  return CONTRACT_COMPONENTS.every((name) => {
    const opens = (mdx.match(new RegExp(`<${name}\\b`, 'g')) ?? []).length;
    const closes = (mdx.match(new RegExp(`</${name}>`, 'g')) ?? []).length;
    const selfClosing = (mdx.match(new RegExp(`<${name}\\b[^>]*/>`, 'g')) ?? []).length;
    return opens === closes + selfClosing;
  });
}

/**
 * Returns `[head, tail]` when the body can be safely split for a mid-article
 * ad, or `[body]` when it can't (missing marker, unbalanced components).
 * Both halves are independently valid MDX when a split is returned.
 */
export function splitForMidArticleAd(body: string): [string] | [string, string] {
  const parts = body.split(SPLIT_MARKER);
  if (parts.length !== 2) return [body];
  const [head, tail] = parts;
  if (!tagsBalanced(head) || !tagsBalanced(tail)) return [body];
  return [head, tail];
}
