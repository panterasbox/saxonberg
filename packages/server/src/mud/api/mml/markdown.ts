/**
 * Markdown → MML — Discord-dialect subset parser. The user-supplied
 * speech / message text comes in as plain text with markdown markers;
 * this module emits MML markup with the matching tags.
 *
 * Subset handled:
 *   - `**bold**`              → `<strong>`
 *   - `*italic*` / `_italic_` → `<em>`
 *   - `` `code` ``            → `<code>`
 *   - ` ```block``` `         → `<pre>` (verbatim; markdown inside is not parsed)
 *   - `> quote`               → `<blockquote>` (one per consecutive line run)
 *   - `- item` / `1. item`    → `<list>` of `<li>` (one level only)
 *   - `~~strike~~`            → `<strike>`
 *   - `[label](URI)`          → `<link href="URI">label</link>` for
 *                                whitelisted URI schemes; bare label
 *                                survives if scheme is unknown
 *   - `@<word>`               → `<mention stuff-id="X">@Word</mention>`
 *                                if the resolver finds a target; bare
 *                                `@word` text survives on miss
 *
 * Out of scope for v1: nested lists, GFM tables, headers, inline
 * HTML, multi-paragraph code-block context. Code spans and code
 * blocks are opaque — markdown emphasis inside them is preserved
 * verbatim.
 *
 * Internal to the MML module; consumers reach this through
 * `Mml.markdownToMml`. The parser uses sentinel substitution to
 * protect code regions across passes, then walks line by line for
 * block-level markers, then runs inline transforms on each segment.
 */

import { decodeEntities, escapeText } from './entities';
import type { MentionResolver } from './mention';
import { isKnownLinkScheme } from './schemes';

/**
 * Parse a Discord-dialect markdown subset into MML markup. Returns
 * the raw markup string; `Mml.markdownToMml` wraps the result in an
 * `Mml.fromMarkup` to preserve the trust contract.
 */
export function parseMarkdown(text: string, resolver?: MentionResolver): string {
  // Phase 1 — extract code blocks (multi-line) and code spans (single-line)
  // so subsequent passes don't munge their contents.
  const codeBlocks: string[] = [];
  let working = text.replace(/```([\s\S]*?)```/g, (_, content: string) => {
    const idx = codeBlocks.length;
    codeBlocks.push(content);
    return ` CB${idx} `;
  });
  const codeSpans: string[] = [];
  working = working.replace(/`([^`\n]+)`/g, (_, content: string) => {
    const idx = codeSpans.length;
    codeSpans.push(content);
    return ` CS${idx} `;
  });

  // Phase 2 — block-level segmentation.
  const lines = working.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;

    // Blockquote run
    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i]!)) {
        quoteLines.push(lines[i]!.replace(/^>\s?/, ''));
        i++;
      }
      const inner = quoteLines.map((l) => processInline(l, resolver)).join('\n');
      out.push(`<blockquote>${inner}</blockquote>`);
      if (i < lines.length) out.push('\n');
      continue;
    }

    // List run (unordered or ordered, but not mixed; first-line marker wins)
    const ulMatch = /^-\s+(.*)$/.exec(line);
    const olMatch = /^\d+\.\s+(.*)$/.exec(line);
    if (ulMatch || olMatch) {
      const ordered = !!olMatch;
      const itemRe = ordered ? /^\d+\.\s+(.*)$/ : /^-\s+(.*)$/;
      const items: string[] = [];
      while (i < lines.length) {
        const m = itemRe.exec(lines[i]!);
        if (!m) break;
        items.push(`<li>${processInline(m[1]!, resolver)}</li>`);
        i++;
      }
      const attr = ordered ? ' ordered="true"' : '';
      out.push(`<list${attr}>${items.join('')}</list>`);
      if (i < lines.length) out.push('\n');
      continue;
    }

    // Plain paragraph line
    out.push(processInline(line, resolver));
    i++;
    // Preserve line break between non-block lines
    if (i < lines.length) out.push('\n');
  }

  let result = out.join('');

  // Phase 4 — restore code sentinels to their MML tags.
  result = result.replace(/ CB(\d+) /g, (_, idxStr: string) => {
    const idx = Number(idxStr);
    return `<pre>${escapeText(codeBlocks[idx] ?? '')}</pre>`;
  });
  result = result.replace(/ CS(\d+) /g, (_, idxStr: string) => {
    const idx = Number(idxStr);
    return `<code>${escapeText(codeSpans[idx] ?? '')}</code>`;
  });

  return result;
}

/**
 * Apply inline transforms (links, mentions, emphasis, strike) to a
 * single line of text. Operates in a single left-to-right pass; each
 * match consumes its slice and the leading plain text is escaped.
 *
 * Match priority is fixed: links → mentions → strike → strong → em.
 * Code spans / blocks are already substituted to sentinels before
 * this runs, so emphasis can't bleed into code.
 *
 * `decodeEntities` is unused here — input has not been through
 * tagged markup; it's user-typed plain text.
 */
function processInline(text: string, resolver?: MentionResolver): string {
  void decodeEntities; // declared as a dependency seam — unused on this path
  // Recursive-descent over a tiny grammar.
  let out = '';
  let i = 0;
  while (i < text.length) {
    // Try matchers in priority order. Each matcher reads from `text`
    // starting at `i`; on success it returns the markup to emit + the
    // position past the consumed slice.
    const linkM = matchLink(text, i, resolver);
    if (linkM) {
      out += linkM.markup;
      i = linkM.next;
      continue;
    }
    const mentionM = matchMention(text, i, resolver);
    if (mentionM) {
      out += mentionM.markup;
      i = mentionM.next;
      continue;
    }
    const strikeM = matchStrike(text, i, resolver);
    if (strikeM) {
      out += strikeM.markup;
      i = strikeM.next;
      continue;
    }
    const strongM = matchStrong(text, i, resolver);
    if (strongM) {
      out += strongM.markup;
      i = strongM.next;
      continue;
    }
    const emM = matchEm(text, i, resolver);
    if (emM) {
      out += emM.markup;
      i = emM.next;
      continue;
    }
    // Sentinel passthrough — leave code sentinels intact so Phase 4
    // can restore them.
    if (text[i] === ' ') {
      // Read up to the next
      const end = text.indexOf(' ', i + 1);
      if (end !== -1) {
        out += text.slice(i, end + 1);
        i = end + 1;
        continue;
      }
    }
    out += escapeText(text[i]!);
    i++;
  }
  return out;
}

interface InlineMatch {
  markup: string;
  next: number;
}

function matchLink(
  text: string,
  i: number,
  resolver?: MentionResolver,
): InlineMatch | null {
  if (text[i] !== '[') return null;
  const closeBracket = text.indexOf(']', i + 1);
  if (closeBracket === -1) return null;
  if (text[closeBracket + 1] !== '(') return null;

  // Balanced paren scan — `[bogus](javascript:alert(1))` has nested
  // parens inside the URI, so a naive `indexOf(')')` would terminate
  // at the inner `)`. Walk forward keeping a depth counter; the URI
  // ends at the close-paren that returns depth to zero.
  let depth = 1;
  let closeParen = -1;
  for (let p = closeBracket + 2; p < text.length; p++) {
    const c = text[p];
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) {
        closeParen = p;
        break;
      }
    }
  }
  if (closeParen === -1) return null;

  const label = text.slice(i + 1, closeBracket);
  const uri = text.slice(closeBracket + 2, closeParen);

  // Process the label inline (mentions / emphasis allowed in labels).
  const labelMarkup = processInline(label, resolver);

  if (isKnownLinkScheme(uri)) {
    return {
      markup: `<link href="${escapeText(uri)}">${labelMarkup}</link>`,
      next: closeParen + 1,
    };
  }

  // Unknown scheme: strip the URI, keep the label.
  return { markup: labelMarkup, next: closeParen + 1 };
}

function matchMention(
  text: string,
  i: number,
  resolver?: MentionResolver,
): InlineMatch | null {
  if (text[i] !== '@') return null;
  // Word boundary check — `email@addr.com` shouldn't trigger.
  if (i > 0 && /[A-Za-z0-9]/.test(text[i - 1]!)) return null;
  const match = /^@([A-Za-z][A-Za-z0-9'-]*)/.exec(text.slice(i));
  if (!match) return null;
  const word = match[1]!;
  const next = i + match[0].length;

  if (!resolver) {
    return { markup: escapeText(match[0]), next };
  }
  const stuffId = resolver.resolveMention(word);
  if (!stuffId) {
    return { markup: escapeText(match[0]), next };
  }
  return {
    markup: `<mention stuff-id="${escapeText(stuffId)}">${escapeText(match[0])}</mention>`,
    next,
  };
}

function matchStrong(
  text: string,
  i: number,
  resolver?: MentionResolver,
): InlineMatch | null {
  if (text.slice(i, i + 2) !== '**') return null;
  const end = text.indexOf('**', i + 2);
  if (end === -1 || end === i + 2) return null;
  const inner = text.slice(i + 2, end);
  return {
    markup: `<strong>${processInline(inner, resolver)}</strong>`,
    next: end + 2,
  };
}

function matchEm(
  text: string,
  i: number,
  resolver?: MentionResolver,
): InlineMatch | null {
  const ch = text[i];
  if (ch !== '*' && ch !== '_') return null;
  // Reject `_` mid-word ("snake_case") — Discord doesn't either.
  if (ch === '_' && i > 0 && /[A-Za-z0-9]/.test(text[i - 1]!)) return null;
  const end = text.indexOf(ch, i + 1);
  if (end === -1 || end === i + 1) return null;
  if (ch === '_' && /[A-Za-z0-9]/.test(text[end + 1] ?? '')) return null;
  const inner = text.slice(i + 1, end);
  return {
    markup: `<em>${processInline(inner, resolver)}</em>`,
    next: end + 1,
  };
}

function matchStrike(
  text: string,
  i: number,
  resolver?: MentionResolver,
): InlineMatch | null {
  if (text.slice(i, i + 2) !== '~~') return null;
  const end = text.indexOf('~~', i + 2);
  if (end === -1) return null;
  const inner = text.slice(i + 2, end);
  return {
    markup: `<strike>${processInline(inner, resolver)}</strike>`,
    next: end + 2,
  };
}
