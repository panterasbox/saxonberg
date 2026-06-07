/**
 * MML flatten serializer — walks a parsed MML tree and emits the
 * markdown-emphasis-preserving failsafe string. Each tag is replaced
 * by its defined flatten per the per-tag table below; unknown tags
 * fall back to their children's flatten (forward-compatible with
 * future tag additions).
 *
 * The flatten serializer is the inverse of `markdownToMml` for the
 * Discord-subset tags — round-trip tests gate this contract.
 *
 * Distinct from `stripTags` (markdown-stripping plain-mode collapse,
 * still on the `Mml` class) — flatten preserves emphasis markdown
 * (`<strong>` → `**...**`), strip removes it.
 */

import { parseToTree, type MmlNode } from './tree';

/** Flatten a full MML body string by parsing + walking. */
export function flatten(body: string): string {
  return flattenNodes(parseToTree(body));
}

function flattenNodes(nodes: MmlNode[]): string {
  return nodes.map(flattenNode).join('');
}

function flattenNode(n: MmlNode): string {
  if (n.kind === 'text') return n.text;
  const inner = flattenNodes(n.children);
  switch (n.tag) {
    case 'strong':
      return `**${inner}**`;
    case 'em':
      return `*${inner}*`;
    case 'code':
      return `\`${inner}\``;
    case 'pre':
      return `\`\`\`${inner}\`\`\``;
    case 'blockquote':
      return inner
        .split('\n')
        .map((line) => (line.length ? `> ${line}` : '>'))
        .join('\n');
    case 'strike':
      return `~~${inner}~~`;
    case 'list': {
      const ordered = n.attrs.ordered === 'true';
      const items = n.children.filter(
        (c): c is Extract<MmlNode, { kind: 'tag' }> =>
          c.kind === 'tag' && c.tag === 'li',
      );
      return items
        .map((li, idx) => {
          const t = flattenNodes(li.children);
          return ordered ? `${idx + 1}. ${t}` : `- ${t}`;
        })
        .join('\n');
    }
    case 'li':
      // Should only be reached if a stray `<li>` appears outside a
      // `<list>` — emit a dashed line as the safest failsafe.
      return `- ${inner}`;
    // Identity / role / inline tags: children verbatim. The
    // tagging layer is for rendering; flatten just emits the
    // already-escaped text.
    default:
      return inner;
  }
}
