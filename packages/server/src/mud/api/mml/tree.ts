/**
 * MML parse tree — server-side recursive-descent parser over the MML
 * tag grammar. Internal to the MML module; consumers reach the tree
 * indirectly through `Mml.flatten` (which calls `parseToTree` and
 * walks the result).
 *
 * The client renderer has its own parallel parser in
 * `packages/client/src/lib/mml/parseMml.ts` so the server tree and
 * client tree don't share a dependency. Both follow the same grammar
 * and tolerate the same edge cases (unclosed tags, stray `<`).
 */

import { decodeEntities } from './entities';

export type MmlNode =
  | { kind: 'text'; text: string }
  | {
      kind: 'tag';
      tag: string;
      attrs: Record<string, string>;
      children: MmlNode[];
    };

/**
 * Parse an MML body into a tree. Recursive-descent over the tag
 * grammar; tolerates unclosed tags by treating remaining input as
 * text once the close fails to match. Decodes entities in text and
 * attribute values per the established contract.
 */
export function parseToTree(body: string): MmlNode[] {
  const state = { input: body, pos: 0 };
  return parseNodes(state, null);
}

function parseNodes(
  state: { input: string; pos: number },
  closingTag: string | null,
): MmlNode[] {
  const out: MmlNode[] = [];
  let textBuf = '';

  while (state.pos < state.input.length) {
    const ch = state.input[state.pos]!;

    if (ch === '<') {
      // Could be opening tag, closing tag, or stray `<` (unlikely from
      // escaped input but tolerated).
      const tagInfo = readTagOpen(state);
      if (!tagInfo) {
        textBuf += ch;
        state.pos++;
        continue;
      }
      if (tagInfo.kind === 'close') {
        if (tagInfo.tag === closingTag) {
          if (textBuf) out.push({ kind: 'text', text: decodeEntities(textBuf) });
          return out;
        }
        // Unexpected close — drop the tag, continue
        continue;
      }
      if (textBuf) {
        out.push({ kind: 'text', text: decodeEntities(textBuf) });
        textBuf = '';
      }
      if (tagInfo.selfClosing) {
        out.push({ kind: 'tag', tag: tagInfo.tag, attrs: tagInfo.attrs, children: [] });
      } else {
        const children = parseNodes(state, tagInfo.tag);
        out.push({ kind: 'tag', tag: tagInfo.tag, attrs: tagInfo.attrs, children });
      }
      continue;
    }

    textBuf += ch;
    state.pos++;
  }

  if (textBuf) out.push({ kind: 'text', text: decodeEntities(textBuf) });
  return out;
}

type TagOpen =
  | { kind: 'open'; tag: string; attrs: Record<string, string>; selfClosing: boolean }
  | { kind: 'close'; tag: string };

/**
 * Read a single tag at `state.pos` (which MUST be on `<`). Advances
 * `state.pos` past the matching `>` on success. Returns `null` if the
 * content at `<` doesn't look like a tag (stray `<` in text).
 */
function readTagOpen(state: {
  input: string;
  pos: number;
}): TagOpen | null {
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
  const spaceIdx = body.indexOf(' ');
  const tag =
    spaceIdx === -1 ? body.toLowerCase() : body.slice(0, spaceIdx).toLowerCase();

  if (isClose) return { kind: 'close', tag };

  const attrs: Record<string, string> = {};
  if (spaceIdx !== -1) {
    const attrPart = body.slice(spaceIdx + 1);
    const ATTR = /([\w-]+)\s*=\s*"([^"]*)"/g;
    let m: RegExpExecArray | null;
    while ((m = ATTR.exec(attrPart)) !== null) {
      attrs[m[1]!] = decodeEntities(m[2]!);
    }
  }

  return { kind: 'open', tag, attrs, selfClosing };
}
