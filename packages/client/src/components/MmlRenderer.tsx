/**
 * MmlRenderer — MML tree → clickable React nodes.
 *
 * Replaces the prior flat-regex parser with the nested-aware tree
 * parser in `lib/mml/parseMml.ts`. Every clickable element wraps
 * its recursively-rendered children in a `ClickableSpan`; the
 * stylesheet engine paints non-clickable tags with treatment from
 * the resolved theme + user overlay (see `lib/style/`).
 *
 * Click model preserved:
 *  - `<exit dir="X">label</exit>` → `go X` on click.
 *  - `<detail key="X">label</detail>` → `look X` on click.
 *  - Identity tags (`<item>`, `<name>`, `<location>`, `<object>`,
 *    `<player>`, `<npc>`) with `stuff-id` → registry lookup, then
 *    `look <primaryKeyword>` (hit) or `look <label>` (miss).
 *  - `<link href="…">label</link>` → scheme-routed by `commandFor`:
 *    `mudcmd:` / `mudref:` go through the command bus; `mudq:` is
 *    inert in v1 (rendered as `InertLinkSpan`, no click handler).
 *  - `<mention stuff-id="X">label</mention>` → no click; renderer
 *    consults the stylesheet's `mention.match` vs `mention.other`
 *    treatment based on whether `X` matches the viewer's stuffId.
 */

import React from 'react';
import styled from 'styled-components';
import { useStore } from '../store';
import { parseMml, type MmlNode } from '../lib/mml/parseMml';
import { FACE_STACKS } from '../styles/faces';

interface MmlRendererProps {
  text: string;
  onCommandClick: (command: string) => void;
  /**
   * Hover handler. Called with the previewed command on mouse-enter,
   * `null` on mouse-leave. The parent shows the command in the input
   * field before the user commits — the educational lever for the
   * click → typed-command translation.
   */
  onCommandPreview: (command: string | null) => void;
  /**
   * Viewer's own stuffId. Used by `<mention>` to apply
   * self-vs-other treatment. Optional because some render contexts
   * (system messages composed at boot, fixtures) have no viewer
   * attached yet — in that case mentions render with the other
   * treatment.
   */
  viewerStuffId?: string;
}

/**
 * Decide what command a clickable tag's click should dispatch. Returns
 * `null` for tags with no actionable click (most rendering tags) and
 * for the v1-inert `mudq:` link scheme.
 *
 * Exported for testing — the renderer-internal switch lives in
 * `renderTag` below; this is the click-route table.
 */
export function commandFor(node: Extract<MmlNode, { kind: 'tag' }>): string | null {
  if (node.tag === 'exit') {
    const dir = node.attrs.dir ?? labelOf(node);
    return `go ${dir}`;
  }
  if (node.tag === 'detail') {
    const key = node.attrs.key ?? labelOf(node);
    return `look ${key}`;
  }
  if (node.tag === 'link') {
    return commandForLink(node.attrs.href ?? '');
  }
  if (
    node.tag === 'item' ||
    node.tag === 'name' ||
    node.tag === 'location' ||
    node.tag === 'object' ||
    node.tag === 'player' ||
    node.tag === 'npc'
  ) {
    const stuffId = node.attrs['stuff-id'];
    const label = labelOf(node);
    if (stuffId) {
      const meta = useStore.getState().stuffRegistry.get(stuffId);
      const keyword = meta?.primaryKeyword;
      if (keyword) return `look ${keyword}`;
    }
    return `look ${label}`;
  }
  return null;
}

/**
 * Map a `<link href>` to the command its click should dispatch. The
 * three custom URI schemes are scheme-routed; `mudq:` returns `null`
 * (inert in v1 — the namespace is reserved but click semantics are
 * not yet decided); any other scheme also returns null (the markdown
 * parser should have stripped them, but tolerate gracefully here).
 */
function commandForLink(href: string): string | null {
  if (href.startsWith('mudcmd:')) {
    return decodeURIComponent(href.slice('mudcmd:'.length));
  }
  if (href.startsWith('mudref:')) {
    const id = href.slice('mudref:'.length);
    const meta = useStore.getState().stuffRegistry.get(id);
    const keyword = meta?.primaryKeyword;
    return keyword ? `look ${keyword}` : `look #${id}`;
  }
  // mudq: — inert; any other scheme — inert (renderer paints styled
  // text with no click handler).
  return null;
}

/**
 * The visible-text content of a tag node (recursive). Used as the
 * click-routing label fallback when no canonical attribute is
 * available (e.g., `<item>sword</item>` with no `stuff-id`).
 */
function labelOf(node: MmlNode): string {
  if (node.kind === 'text') return node.text;
  return node.children.map(labelOf).join('');
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

/**
 * Inert link affordance for `mudq:` URIs (and any other namespaced
 * link the v1 build can't route). Deliberately NOT styled like a
 * clickable link: no underline, no cursor change, no hover state.
 * A subtle accent color signals "this is a known link kind that
 * doesn't do anything yet" without misleading the reader into
 * clicking.
 */
const InertLinkSpan = styled.span`
  color: #88a;
  font-style: italic;
`;

/**
 * Speech body — rendered as plain text in quotes (the body itself
 * carries the `"..."` characters, and the framing "X says," precedes
 * it). No frame-level italic or bold: per-word `*italic*` and
 * `**bold**` are how emphasis lands inside speech, and frame-level
 * decoration would erase them.
 */
const SpeechSpan = styled.span``;

const StrongSpan = styled.span`
  font-weight: bold;
`;

const EmSpan = styled.span`
  font-style: italic;
`;

const CodeSpan = styled.span`
  font-family: ${FACE_STACKS.mono};
  background: #2a2a2a;
  padding: 0 3px;
  border-radius: 2px;
`;

const StrikeSpan = styled.span`
  text-decoration: line-through;
`;

const PreBlock = styled.pre`
  margin: 0;
  font-family: ${FACE_STACKS.mono};
  background: #2a2a2a;
  padding: 4px 6px;
  border-radius: 3px;
  white-space: pre-wrap;
`;

const Blockquote = styled.blockquote`
  margin: 0;
  padding: 0 0 0 8px;
  border-left: 2px solid #555;
  color: #bbb;
`;

const ChanChip = styled.span`
  color: #c8b76a;
  font-weight: 500;
`;

const MentionSpan = styled.span<{ $self: boolean }>`
  color: ${(p) => (p.$self ? '#ffd966' : '#a89bd8')};
  font-weight: ${(p) => (p.$self ? 600 : 400)};
  background: ${(p) => (p.$self ? 'rgba(255, 217, 102, 0.12)' : 'transparent')};
  padding: ${(p) => (p.$self ? '0 2px' : '0')};
  border-radius: ${(p) => (p.$self ? '2px' : '0')};
`;

/**
 * Render a tree of MML nodes into React. Recursive — every tag's
 * children render through the same function, so nested clickable
 * tags (e.g., a `<link>` whose label contains a `<strong>`) compose
 * cleanly. Each unique tag's treatment is a styled component above;
 * the stylesheet engine in `lib/style/` layers user-overlay
 * treatments on top via the resolved `Stylesheet` carried through
 * the per-message-type templates.
 */
function renderNodes(
  nodes: MmlNode[],
  ctx: RenderCtx,
): React.ReactNode[] {
  return nodes.map((node, idx) => renderNode(node, idx, ctx));
}

interface RenderCtx {
  onCommandClick: (command: string) => void;
  onCommandPreview: (command: string | null) => void;
  viewerStuffId?: string;
}

function renderNode(
  node: MmlNode,
  key: number,
  ctx: RenderCtx,
): React.ReactNode {
  if (node.kind === 'text') {
    return <React.Fragment key={key}>{node.text}</React.Fragment>;
  }

  const children = renderNodes(node.children, ctx);

  // Inline / presentational tags — no click handlers, just styled.
  switch (node.tag) {
    case 'speech':
      return <SpeechSpan key={key}>{children}</SpeechSpan>;
    case 'strong':
      return <StrongSpan key={key}>{children}</StrongSpan>;
    case 'em':
      return <EmSpan key={key}>{children}</EmSpan>;
    case 'code':
      return <CodeSpan key={key}>{children}</CodeSpan>;
    case 'pre':
      return <PreBlock key={key}>{children}</PreBlock>;
    case 'blockquote':
      return <Blockquote key={key}>{children}</Blockquote>;
    case 'strike':
      return <StrikeSpan key={key}>{children}</StrikeSpan>;
    case 'chan':
      return <ChanChip key={key}>{children}</ChanChip>;
    case 'msg':
      // No wrapper styling — `<msg>` is a region marker the
      // per-message-type templates consume for layout (chat's
      // hanging-indent column). For inline rendering it passes
      // through.
      return <React.Fragment key={key}>{children}</React.Fragment>;
    case 'mention': {
      const matchesViewer =
        ctx.viewerStuffId !== undefined &&
        node.attrs['stuff-id'] === ctx.viewerStuffId;
      return (
        <MentionSpan key={key} $self={matchesViewer}>
          {children}
        </MentionSpan>
      );
    }
    case 'list': {
      const ordered = node.attrs.ordered === 'true';
      // v1 inline rendering: emit children with a separator. The
      // Wave 2 layout-library lift turns this into proper <ol>/<ul>
      // with indent + bullets.
      return (
        <React.Fragment key={key}>
          {node.children
            .filter((c): c is Extract<MmlNode, { kind: 'tag' }> =>
              c.kind === 'tag' && c.tag === 'li',
            )
            .map((li, liIdx) => (
              <React.Fragment key={liIdx}>
                {ordered ? `${liIdx + 1}. ` : '- '}
                {renderNodes(li.children, ctx)}
                {liIdx < node.children.length - 1 ? '\n' : ''}
              </React.Fragment>
            ))}
        </React.Fragment>
      );
    }
    case 'li':
      // Should only render here if a stray `<li>` appears outside a
      // `<list>` — fall back to a dashed line.
      return (
        <React.Fragment key={key}>
          {'- '}
          {children}
        </React.Fragment>
      );
    case 'link': {
      const href = node.attrs.href ?? '';
      const cmd = commandForLink(href);
      if (cmd === null) {
        // mudq: or unknown scheme — inert.
        return <InertLinkSpan key={key}>{children}</InertLinkSpan>;
      }
      return (
        <ClickableSpan
          key={key}
          onClick={() => ctx.onCommandClick(cmd)}
          onMouseEnter={() => ctx.onCommandPreview(cmd)}
          onMouseLeave={() => ctx.onCommandPreview(null)}
          title={`Click to send: ${cmd}`}
        >
          {children}
        </ClickableSpan>
      );
    }
  }

  // Clickable identity tags — delegate to commandFor for the routing.
  const cmd = commandFor(node);
  if (cmd === null) {
    // Unknown tag → render children verbatim (forward-compatible with
    // future server-side tag additions).
    return <React.Fragment key={key}>{children}</React.Fragment>;
  }

  return (
    <ClickableSpan
      key={key}
      onClick={() => ctx.onCommandClick(cmd)}
      onMouseEnter={() => ctx.onCommandPreview(cmd)}
      onMouseLeave={() => ctx.onCommandPreview(null)}
      title={`Click to send: ${cmd}`}
    >
      {children}
    </ClickableSpan>
  );
}

export function MmlRenderer({
  text,
  onCommandClick,
  onCommandPreview,
  viewerStuffId,
}: MmlRendererProps) {
  const tree = React.useMemo(() => parseMml(text), [text]);

  return (
    <>
      {renderNodes(tree, {
        onCommandClick,
        onCommandPreview,
        viewerStuffId,
      })}
    </>
  );
}
