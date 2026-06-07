/**
 * MML parser — string → tree.
 *
 * Replaces the flat-regex parser in `components/MmlRenderer.tsx`. The
 * old parser's `TAG_REGEX` matched only `<tag>label</tag>` with no
 * nesting, so any content like `Mml.compose\`<item>${Mml.quantity(5)}
 * apples</item>\`` (which the server emits when prose joins
 * identity tags with quantities) silently dropped the inner tag.
 * This parser is a small state machine: returns an `MmlNode` tree
 * the renderer walks recursively, preserves the five-entity decoding
 * contract, and tolerates unclosed tags by treating the trailing
 * input as text (matching the old parser's "tolerate" behavior).
 *
 * Tag and attribute names are lowercased on the tree so the renderer
 * can switch without case sensitivity.
 */

export type MmlNode =
  | { kind: 'text'; text: string }
  | {
      kind: 'tag';
      tag: string;
      attrs: Record<string, string>;
      children: MmlNode[];
    };

/**
 * The five MML-recognised entities. Mirrors `Mml.escape` (server-side
 * in `packages/server/src/mud/api/mml.ts`) and the prior renderer's
 * `decodeEntities`. The replacement order is significant: `&amp;`
 * MUST be replaced last so an escaped entity-like sequence
 * (`&amp;lt;` ⇒ `&lt;`) survives intact.
 */
export function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

const ATTR_REGEX = /([\w-]+)\s*=\s*"([^"]*)"/g;

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  let match: RegExpExecArray | null;
  ATTR_REGEX.lastIndex = 0;
  while ((match = ATTR_REGEX.exec(raw)) !== null) {
    attrs[match[1]!] = decodeEntities(match[2]!);
  }
  return attrs;
}

interface CursorState {
  input: string;
  pos: number;
}

interface TagOpen {
  kind: 'open' | 'close';
  tag: string;
  attrs: Record<string, string>;
  selfClosing: boolean;
}

/**
 * Read a tag header at `state.pos` (which must be on `<`). On
 * success, advances `state.pos` past the matching `>`. Returns
 * `null` if the content looks like a stray `<` (no matching `>`,
 * empty tag name).
 */
function readTagHeader(state: CursorState): TagOpen | null {
  const { input } = state;
  const close = input.indexOf('>', state.pos + 1);
  if (close === -1) return null;
  const raw = input.slice(state.pos + 1, close);
  state.pos = close + 1;

  let isClose = false;
  let body = raw;
  if (body.startsWith('/')) {
    isClose = true;
    body = body.slice(1);
  }
  const selfClosing = body.endsWith('/');
  if (selfClosing) body = body.slice(0, -1);

  body = body.trim();
  if (!body) return null;

  const spaceIdx = body.indexOf(' ');
  const tag =
    spaceIdx === -1 ? body.toLowerCase() : body.slice(0, spaceIdx).toLowerCase();

  if (isClose) {
    return { kind: 'close', tag, attrs: {}, selfClosing: false };
  }
  const attrs = spaceIdx === -1 ? {} : parseAttrs(body.slice(spaceIdx + 1));
  return { kind: 'open', tag, attrs, selfClosing };
}

/**
 * Recursive descent over the input. When `closingTag` is non-null
 * we're inside the body of that tag — a matching close-tag pops the
 * frame; mismatched closes are silently dropped (matches the prior
 * tolerate-unclosed-tags behavior).
 */
function parseNodes(state: CursorState, closingTag: string | null): MmlNode[] {
  const out: MmlNode[] = [];
  let textBuf = '';

  while (state.pos < state.input.length) {
    const ch = state.input[state.pos]!;

    if (ch === '<') {
      const tagInfo = readTagHeader(state);
      if (!tagInfo) {
        textBuf += ch;
        state.pos++;
        continue;
      }
      if (tagInfo.kind === 'close') {
        if (tagInfo.tag === closingTag) {
          if (textBuf) {
            out.push({ kind: 'text', text: decodeEntities(textBuf) });
          }
          return out;
        }
        // Unexpected close — drop it. Flush any pending text first
        // so the dropped tag becomes a real boundary in the text
        // run (otherwise "before</wat>after" collapses to one node).
        if (textBuf) {
          out.push({ kind: 'text', text: decodeEntities(textBuf) });
          textBuf = '';
        }
        continue;
      }
      if (textBuf) {
        out.push({ kind: 'text', text: decodeEntities(textBuf) });
        textBuf = '';
      }
      if (tagInfo.selfClosing) {
        out.push({
          kind: 'tag',
          tag: tagInfo.tag,
          attrs: tagInfo.attrs,
          children: [],
        });
      } else {
        const children = parseNodes(state, tagInfo.tag);
        out.push({
          kind: 'tag',
          tag: tagInfo.tag,
          attrs: tagInfo.attrs,
          children,
        });
      }
      continue;
    }

    textBuf += ch;
    state.pos++;
  }

  if (textBuf) {
    out.push({ kind: 'text', text: decodeEntities(textBuf) });
  }
  return out;
}

/**
 * Parse an MML body into a tree.
 *
 * Tolerant: malformed tags are dropped, unclosed tags consume the
 * remaining input as text, unbalanced close-tags are silently
 * skipped. Empty input returns `[]`.
 */
export function parseMml(input: string): MmlNode[] {
  return parseNodes({ input, pos: 0 }, null);
}
