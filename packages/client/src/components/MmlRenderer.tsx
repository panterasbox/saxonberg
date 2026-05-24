/**
 * MmlRenderer - Inline MML → clickable React nodes
 *
 * Parses an MML string into a flat list of text + tag nodes and
 * renders each tag as a clickable span that emits a real command
 * via `onCommandClick`. The principle is command-bus primacy: every
 * click resolves to a typed command equivalent.
 *
 * v0 handles `<exit dir="X">label</exit>` only. Other tags pass
 * through as their text content (forward-compatible with the rest
 * of the taxonomy as the server starts emitting them).
 *
 * **Known limitation — flat tags only.** Parsing is regex-based;
 * the content match is `[^<]*` so any `<` inside a tag body kills
 * the match. The server's `Mml.compose` (`api/mml.ts`) natively
 * supports nesting via tagged-template interpolation, so authored
 * prose that does `Mml.compose\`${Mml.item(x)} contains
 * ${Mml.quantity(y)}\`` will produce nested tags this regex can't
 * handle. When the first nested case appears in real server prose,
 * swap this for a state-machine parser modelled on the server's
 * `stripTags` — ~150 lines, returns a tree, recursive renderer
 * wraps children of clickable tags in a ClickableSpan.
 */

import React from 'react';
import styled from 'styled-components';

interface MmlRendererProps {
  text: string;
  onCommandClick: (command: string) => void;
  /**
   * Hover handler. Called with the previewed command on mouse-enter,
   * and `null` on mouse-leave. Lets the parent show the command in
   * the input field before the user commits — the educational lever
   * for the click → typed-command translation.
   */
  onCommandPreview: (command: string | null) => void;
}

type ParsedNode =
  | { kind: 'text'; text: string }
  | { kind: 'tag'; tag: string; attrs: Record<string, string>; label: string };

const TAG_REGEX = /<(\w+)([^>]*)>([^<]*)<\/\1>/g;
const ATTR_REGEX = /(\w+)\s*=\s*"([^"]*)"/g;

/**
 * Decode the five MML-recognised entities. Mirrors the server-side
 * `Mml.escape` / `Mml.stripTags` contract in `api/mml.ts`: the server
 * emits `<`, `>`, `&`, `"`, `'` as `&lt;`, `&gt;`, `&amp;`, `&quot;`,
 * `&apos;` and expects the renderer to undo the substitution before
 * display. `&amp;` is replaced last so an escaped entity-like
 * sequence (`&amp;lt;` ⇒ literal `&lt;`) survives intact.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseAttrs(attrsStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  let match: RegExpExecArray | null;
  ATTR_REGEX.lastIndex = 0;
  while ((match = ATTR_REGEX.exec(attrsStr)) !== null) {
    attrs[match[1]!] = decodeEntities(match[2]!);
  }
  return attrs;
}

function parseMml(text: string): ParsedNode[] {
  const nodes: ParsedNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  TAG_REGEX.lastIndex = 0;
  while ((match = TAG_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({
        kind: 'text',
        text: decodeEntities(text.slice(lastIndex, match.index)),
      });
    }
    const tag = match[1]!;
    const attrs = parseAttrs(match[2] ?? '');
    const label = decodeEntities(match[3] ?? '');
    nodes.push({ kind: 'tag', tag, attrs, label });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    nodes.push({ kind: 'text', text: decodeEntities(text.slice(lastIndex)) });
  }
  return nodes;
}

/**
 * Map a tag node to the command its click should send.
 * Returns null if the tag is not actionable (rendered as plain text).
 *
 * v0: only `<exit>` is wired. The branches for the remaining slate
 * tags are explicitly omitted here — they land as the server starts
 * emitting them, alongside any tag-specific UX work (right-click
 * menus, hover previews).
 *
 * The exit click emits the canonical `go <dir>` form rather than
 * the bare-direction alias. Both work on the server (cardinal-
 * direction aliases ship as defaults on `MobileMixin`), but the
 * pedagogical principle of the click model is "show the structured
 * verb." A new user clicks `north` and sees `go north` populate the
 * input, which generalizes — to `go to <place>`, `swim north`,
 * `climb up`, etc. — far better than the abbreviation does.
 * Keyboard users still get `n` / `north` as typing shortcuts.
 */
function commandFor(node: Extract<ParsedNode, { kind: 'tag' }>): string | null {
  if (node.tag === 'exit') {
    return `go ${node.attrs.dir ?? node.label}`;
  }
  return null;
}

const ClickableSpan = styled.span`
  color: #4ec9b0;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 2px;

  &:hover {
    color: #7fdfc8;
    text-decoration-style: solid;
  }

  &:active {
    color: #b8eedc;
  }
`;

export function MmlRenderer({
  text,
  onCommandClick,
  onCommandPreview,
}: MmlRendererProps) {
  const nodes = React.useMemo(() => parseMml(text), [text]);

  return (
    <>
      {nodes.map((node, idx) => {
        if (node.kind === 'text') {
          return <React.Fragment key={idx}>{node.text}</React.Fragment>;
        }
        const cmd = commandFor(node);
        if (cmd === null) {
          return <React.Fragment key={idx}>{node.label}</React.Fragment>;
        }
        return (
          <ClickableSpan
            key={idx}
            onClick={() => onCommandClick(cmd)}
            onMouseEnter={() => onCommandPreview(cmd)}
            onMouseLeave={() => onCommandPreview(null)}
            title={`Click to send: ${cmd}`}
          >
            {node.label}
          </ClickableSpan>
        );
      })}
    </>
  );
}
