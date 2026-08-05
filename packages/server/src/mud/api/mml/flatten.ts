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
          // An item's children split in two: its own inline content,
          // and any nested `<list>`. The nested list flattens to its
          // own dash-lines, which get one level of indent so depth
          // survives the projection and the result re-parses (in the
          // article dialect) to the same tree.
          const own = li.children.filter(
            (c) => !(c.kind === 'tag' && c.tag === 'list'),
          );
          const nested = li.children.filter(
            (c): c is Extract<MmlNode, { kind: 'tag' }> =>
              c.kind === 'tag' && c.tag === 'list',
          );
          const marker = ordered ? `${idx + 1}. ` : '- ';
          const lines = [`${marker}${flattenNodes(own)}`];
          for (const sub of nested) {
            for (const line of flattenNode(sub).split('\n')) {
              lines.push(`  ${line}`);
            }
          }
          return lines.join('\n');
        })
        .join('\n');
    }
    case 'li':
      // Should only be reached if a stray `<li>` appears outside a
      // `<list>` — emit a dashed line as the safest failsafe.
      return `- ${inner}`;
    // ── Long-form (the wiki build) ──
    // Headings flatten to their ATX markdown form, carrying the sticky
    // anchor in the `{#id}` suffix `parseMarkdown` round-trips. The
    // anchor is part of the source (docs/subsystems/wiki.md § anchors),
    // so dropping it here would break citation round-trip.
    case 'h1':
    case 'h2':
    case 'h3': {
      const hashes = '#'.repeat(Number(n.tag.slice(1)));
      const anchor = n.attrs.anchor ? ` {#${n.attrs.anchor}}` : '';
      return `${hashes} ${inner}${anchor}`;
    }
    case 'table': {
      const rows = n.children.filter(
        (c): c is Extract<MmlNode, { kind: 'tag' }> =>
          c.kind === 'tag' && c.tag === 'tr',
      );
      if (rows.length === 0) return '';
      const lines: string[] = [];
      rows.forEach((row, idx) => {
        const cells = row.children.filter(
          (c): c is Extract<MmlNode, { kind: 'tag' }> =>
            c.kind === 'tag' && (c.tag === 'th' || c.tag === 'td'),
        );
        lines.push(`| ${cells.map((c) => flattenNodes(c.children)).join(' | ')} |`);
        // A header row is followed by the separator that makes the
        // result re-parse as a table (the round-trip contract).
        const isHeader = cells.some((c) => c.tag === 'th');
        if (idx === 0 && isHeader) {
          lines.push(`|${cells.map(() => ' --- ').join('|')}|`);
        }
      });
      return lines.join('\n');
    }
    case 'tr':
      // Stray `<tr>` outside a `<table>` — emit one pipe row.
      return `| ${inner} |`;
    case 'th':
    case 'td':
      return inner;
    // A spoiler's flatten is its CONTENT, not a marker. Flatten is a
    // failsafe projection of an already-gated body: by the time any
    // body reaches it the renderer has deleted what the reader may not
    // see (criterion 24), so what remains is readable by construction.
    // Emitting `[spoiler]` here would hide text the reader is entitled
    // to on exactly the surfaces that have no client to un-hide it.
    case 'spoiler':
      return inner;
    // Identity / role / inline tags: children verbatim. The
    // tagging layer is for rendering; flatten just emits the
    // already-escaped text.
    default:
      return inner;
  }
}
