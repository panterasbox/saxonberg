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
 * Two dialects, one parser, selected by {@link MarkdownOptions}:
 *
 *   - **chat** (the default) — exactly the subset above. Every
 *     hot-path caller (`say`, `tell`, `dm`, `emote`) gets byte-identical
 *     output to what it got before long-form existed.
 *   - **article** (`longForm: true`) — a superset adding `#`–`###`
 *     headings with sticky `{#anchor}` suffixes, indent-nested lists,
 *     and pipe tables. The wiki's render pipeline uses this one.
 *
 * An options bag rather than a second parser, because `parseMarkdown`
 * runs on every utterance and a forked long-form parser would drift
 * from the chat one silently. The cost is that the two dialects share
 * regexes, which is why the corpus test exists.
 *
 * Still out of scope in both: inline HTML, multi-paragraph code-block
 * context, table spans and alignment. Code spans and code blocks are
 * opaque — markdown emphasis inside them is preserved verbatim.
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
 * Per-call parser options. **The default is the chat dialect**, byte
 * for byte — `say`, `tell`, `dm`, `emote` and every other hot-path
 * caller passes nothing and gets exactly the output they got before
 * long-form existed. A regression corpus asserts that (see
 * `mml.corpus.test.ts`), because the alternative to an options bag was
 * forking the parser, and a fork drifts.
 *
 * `longForm` lights the article dialect: ATX headings with sticky
 * anchors, indent-nested lists, and pipe tables. It also narrows the
 * code-sentinel passthrough (see {@link processInline}) so inline links
 * work mid-line, which they do not in the chat dialect.
 */
export interface MarkdownOptions {
  /** Parse the article dialect (headings, nested lists, tables). */
  longForm?: boolean;
}

/**
 * Parse a Discord-dialect markdown subset into MML markup. Returns
 * the raw markup string; `Mml.markdownToMml` wraps the result in an
 * `Mml.fromMarkup` to preserve the trust contract.
 *
 * With `opts.longForm`, the article dialect is parsed instead — a
 * superset, so every chat construct still means what it meant.
 */
export function parseMarkdown(
  text: string,
  resolver?: MentionResolver,
  opts?: MarkdownOptions,
): string {
  const longForm = opts?.longForm === true;
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

    // ── Long-form block constructs (article dialect only) ──
    if (longForm) {
      // ATX heading, with the optional sticky-anchor suffix.
      const headingMatch = HEADING_RE.exec(line);
      if (headingMatch) {
        const level = headingMatch[1]!.length;
        const rest = headingMatch[2]!;
        const anchorMatch = ANCHOR_SUFFIX_RE.exec(rest);
        const textPart = (anchorMatch ? rest.slice(0, anchorMatch.index) : rest)
          .trimEnd();
        const anchor = anchorMatch?.[1];
        const attr = anchor ? ` anchor="${escapeText(anchor)}"` : '';
        out.push(
          `<h${level}${attr}>${processInline(textPart, resolver, longForm)}</h${level}>`,
        );
        i++;
        if (i < lines.length) out.push('\n');
        continue;
      }

      // Pipe table — a run of `|`-delimited rows. The optional
      // `|---|---|` second line marks the first row as a header.
      if (isTableRow(line)) {
        const rows: string[] = [];
        while (i < lines.length && isTableRow(lines[i]!)) {
          rows.push(lines[i]!);
          i++;
        }
        out.push(renderTable(rows, resolver, longForm));
        if (i < lines.length) out.push('\n');
        continue;
      }
    }

    // Blockquote run
    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i]!)) {
        quoteLines.push(lines[i]!.replace(/^>\s?/, ''));
        i++;
      }
      const inner = quoteLines
        .map((l) => processInline(l, resolver, longForm))
        .join('\n');
      out.push(`<blockquote>${inner}</blockquote>`);
      if (i < lines.length) out.push('\n');
      continue;
    }

    // Indent-nested list run (article dialect). Runs BEFORE the flat
    // list branch so an indented continuation joins its parent item
    // instead of terminating the run.
    if (longForm && NESTED_ITEM_RE.test(line)) {
      const itemLines: string[] = [];
      while (i < lines.length && NESTED_ITEM_RE.test(lines[i]!)) {
        itemLines.push(lines[i]!);
        i++;
      }
      out.push(renderNestedList(itemLines, resolver, longForm));
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
        items.push(`<li>${processInline(m[1]!, resolver, longForm)}</li>`);
        i++;
      }
      const attr = ordered ? ' ordered="true"' : '';
      out.push(`<list${attr}>${items.join('')}</list>`);
      if (i < lines.length) out.push('\n');
      continue;
    }

    // Plain paragraph line
    out.push(processInline(line, resolver, longForm));
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
 *
 * ⚠ The chat dialect's sentinel passthrough is **wider than a
 * sentinel**: on hitting a space it copies everything up to the next
 * space verbatim, which swallows any construct that begins mid-line
 * after a space — `a [label](mudcmd:x) link` never becomes a `<link>`.
 * That is shipped behaviour on the chat path and the regression corpus
 * pins it, so it is not changed here. The article dialect narrows the
 * passthrough to actual sentinels, which is what makes an inline link
 * work in wiki prose.
 */
function processInline(
  text: string,
  resolver?: MentionResolver,
  longForm = false,
): string {
  void decodeEntities; // declared as a dependency seam — unused on this path
  // Recursive-descent over a tiny grammar.
  let out = '';
  let i = 0;
  while (i < text.length) {
    // Try matchers in priority order. Each matcher reads from `text`
    // starting at `i`; on success it returns the markup to emit + the
    // position past the consumed slice.
    const linkM = matchLink(text, i, resolver, longForm);
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
    const strikeM = matchStrike(text, i, resolver, longForm);
    if (strikeM) {
      out += strikeM.markup;
      i = strikeM.next;
      continue;
    }
    const strongM = matchStrong(text, i, resolver, longForm);
    if (strongM) {
      out += strongM.markup;
      i = strongM.next;
      continue;
    }
    const emM = matchEm(text, i, resolver, longForm);
    if (emM) {
      out += emM.markup;
      i = emM.next;
      continue;
    }
    // Sentinel passthrough — leave code sentinels intact so Phase 4
    // can restore them.
    if (text[i] === ' ') {
      if (longForm) {
        // Article dialect: copy a sentinel and nothing else.
        SENTINEL_RE.lastIndex = 0;
        const m = SENTINEL_RE.exec(text.slice(i));
        if (m) {
          out += m[0];
          i += m[0].length;
          continue;
        }
      } else {
        // Read up to the next
        const end = text.indexOf(' ', i + 1);
        if (end !== -1) {
          out += text.slice(i, end + 1);
          i = end + 1;
          continue;
        }
      }
    }
    out += escapeText(text[i]!);
    i++;
  }
  return out;
}

/** A code sentinel as Phase 1 wrote it: ` CB<n> ` or ` CS<n> `. */
const SENTINEL_RE = /^ C[BS]\d+ /;

/** ATX heading, one to three hashes. */
const HEADING_RE = /^(#{1,3})\s+(.*)$/;

/** The sticky-anchor suffix on a heading line: `## Uses {#uses}`. */
const ANCHOR_SUFFIX_RE = /\{#([A-Za-z0-9][A-Za-z0-9-]*)\}\s*$/;

/** A list item at any indent depth (article dialect). */
const NESTED_ITEM_RE = /^(\s*)(?:-|\d+\.)\s+/;

/** Whether a line is a pipe-table row. */
function isTableRow(line: string): boolean {
  return /^\s*\|/.test(line);
}

/** Whether a pipe row is the `|---|---|` header separator. */
function isSeparatorRow(line: string): boolean {
  return /^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/.test(line);
}

/** Split a pipe row into its cells, dropping the leading/trailing pipes. */
function splitCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((c) => c.trim());
}

/**
 * Render a run of pipe rows as a `<table>`. The first row is a header
 * (`<th>`) iff the second row is the `|---|` separator — which is also
 * exactly what `flatten` emits, so the pair round-trips.
 *
 * No spans and no alignment in v1: a separator's `:---:` is parsed and
 * discarded rather than rejected, so an author pasting a GFM table gets
 * a table rather than an error.
 */
function renderTable(
  rows: string[],
  resolver: MentionResolver | undefined,
  longForm: boolean,
): string {
  const hasHeader = rows.length > 1 && isSeparatorRow(rows[1]!);
  const body = rows.filter((r) => !isSeparatorRow(r));
  const out: string[] = [];
  body.forEach((row, idx) => {
    const cell = hasHeader && idx === 0 ? 'th' : 'td';
    const cells = splitCells(row)
      .map((c) => `<${cell}>${processInline(c, resolver, longForm)}</${cell}>`)
      .join('');
    out.push(`<tr>${cells}</tr>`);
  });
  return `<table>${out.join('')}</table>`;
}

/**
 * Render an indent-nested list run. Indentation is measured in leading
 * whitespace columns (a tab counts as one); a deeper item opens a
 * nested `<list>` **inside the previous `<li>`**, which is the shape
 * `flatten` re-indents and the client renderer indents visually.
 *
 * Ordered-ness is decided per level by the first item at that level, so
 * a numbered sub-list under a bulleted parent works.
 */
function renderNestedList(
  lines: string[],
  resolver: MentionResolver | undefined,
  longForm: boolean,
): string {
  interface Item {
    text: string;
    children: Item[];
    ordered: boolean;
  }
  const roots: Item[] = [];
  // Stack of (indent, sibling-list) frames, outermost first.
  const stack: Array<{ indent: number; items: Item[] }> = [
    { indent: -1, items: roots },
  ];

  for (const line of lines) {
    const m = /^(\s*)(-|\d+\.)\s+(.*)$/.exec(line);
    if (!m) continue;
    const indent = m[1]!.length;
    const ordered = m[2] !== '-';
    const item: Item = { text: m[3]!, children: [], ordered };

    // Pop frames until the top frame is shallower than this item.
    while (stack.length > 1 && indent <= stack[stack.length - 1]!.indent) {
      stack.pop();
    }
    const top = stack[stack.length - 1]!;
    top.items.push(item);
    stack.push({ indent, items: item.children });
  }

  const emit = (items: Item[]): string => {
    if (items.length === 0) return '';
    const attr = items[0]!.ordered ? ' ordered="true"' : '';
    const lis = items
      .map(
        (it) =>
          `<li>${processInline(it.text, resolver, longForm)}${emit(it.children)}</li>`,
      )
      .join('');
    return `<list${attr}>${lis}</list>`;
  };
  return emit(roots);
}

interface InlineMatch {
  markup: string;
  next: number;
}

function matchLink(
  text: string,
  i: number,
  resolver?: MentionResolver,
  longForm = false,
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
  const labelMarkup = processInline(label, resolver, longForm);

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
  longForm = false,
): InlineMatch | null {
  if (text.slice(i, i + 2) !== '**') return null;
  const end = text.indexOf('**', i + 2);
  if (end === -1 || end === i + 2) return null;
  const inner = text.slice(i + 2, end);
  return {
    markup: `<strong>${processInline(inner, resolver, longForm)}</strong>`,
    next: end + 2,
  };
}

function matchEm(
  text: string,
  i: number,
  resolver?: MentionResolver,
  longForm = false,
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
    markup: `<em>${processInline(inner, resolver, longForm)}</em>`,
    next: end + 1,
  };
}

function matchStrike(
  text: string,
  i: number,
  resolver?: MentionResolver,
  longForm = false,
): InlineMatch | null {
  if (text.slice(i, i + 2) !== '~~') return null;
  const end = text.indexOf('~~', i + 2);
  if (end === -1) return null;
  const inner = text.slice(i + 2, end);
  return {
    markup: `<strike>${processInline(inner, resolver, longForm)}</strike>`,
    next: end + 2,
  };
}
