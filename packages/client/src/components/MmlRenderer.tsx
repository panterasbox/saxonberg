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
import { tokens } from './ui';

/**
 * Friendly color names → palette tokens, so authored prose can write
 * the natural word (`<color value="purple">`) and still resolve through
 * the theme palette (kept legible under any theme). Palette tokens pass
 * through unchanged.
 */
const COLOR_ALIASES: Record<string, string> = {
  purple: 'violet',
  blue: 'sky',
  red: 'rose',
  grey: 'slate',
  gray: 'slate',
  green: 'emerald',
  gold: 'amber',
  yellow: 'amber',
};

/**
 * Map a server palette token or friendly color name (`amber`, `rose`,
 * `purple`, …) to a concrete theme color, falling back to `neutral` for
 * an unknown token. The same `tokens.palette` map the `NotificationQueue`
 * toast uses, so a `<name color="amber">` room occupant and its presence
 * banner tint identically. Returns `undefined` for an absent attr (no
 * tint).
 */
function paletteFor(token: string | undefined): string | undefined {
  if (!token) return undefined;
  const resolved = COLOR_ALIASES[token] ?? token;
  return tokens.palette[resolved] ?? tokens.palette.neutral!;
}

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
    node.tag === 'thing' ||
    node.tag === 'location' ||
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

const ClickableSpan = styled.span<{ $tint?: string }>`
  color: ${(p) => p.$tint ?? tokens.color.accent};
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 2px;

  &:hover {
    color: ${(p) => p.$tint ?? tokens.color.accentHover};
    text-decoration-style: solid;
  }

  /* ⚠ :hover and :active share accentHover. The pre-civic palette had
     three hand-picked steps here; the ground vocabulary carries one
     -lift step per colour family on purpose, and minting a good-press
     role for one :active state would be the vocabulary growing to fit
     an accident rather than a need. The solid underline on hover
     already carries the state change. */
  &:active {
    color: ${(p) => p.$tint ?? tokens.color.accentHover};
  }
`;

/**
 * Copy a command to the clipboard with a ghost-line "copied: …" flash.
 * The explicit "make it mine" path (paste into whichever bar you want) —
 * replaces shift-click-loads-a-bar, which has no honest target under
 * multiple bars. Bound to shift-click + the right-click on an affordance.
 */
function copyCommand(cmd: string): void {
  void navigator.clipboard?.writeText(cmd).catch(() => {});
  useStore.getState().flashGhost(`copied: ${cmd}`);
}

/**
 * Affordance primary-click: shift-click copies; a plain click runs the
 * command un-moded (preview equals send). Centralized so both clickable
 * sites share the gesture model.
 */
function handleAffordanceClick(
  e: React.MouseEvent,
  cmd: string,
  onCommandClick: (command: string) => void,
): void {
  if (e.shiftKey) {
    e.preventDefault();
    copyCommand(cmd);
    return;
  }
  onCommandClick(cmd);
}

/**
 * Non-clickable highlight wrapper for `<highlight color="…">` (the
 * `onMessage: full` message-restyle surface). Forward-compat: the server
 * restyle path isn't wired live yet, but render the color tint when the
 * attr is present so the surface lights up the moment it is.
 */
const HighlightSpan = styled.span<{ $tint?: string }>`
  color: ${(p) => p.$tint ?? 'inherit'};
`;

/**
 * Explicit color wrapper for `<color value="…">` — the literal-color
 * tag. Tints its content (and any clickable descendant, since a span's
 * own color wins over an ancestor ClickableSpan's). Unknown / absent
 * value falls through to inherited color.
 */
const ColorSpan = styled.span<{ $tint?: string }>`
  color: ${(p) => p.$tint ?? 'inherit'};
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
  color: ${tokens.color.fgMuted};
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
  background: ${tokens.color.surfaceAlt};
  padding: 0 3px;
  border-radius: ${tokens.radius.sm};
`;

const StrikeSpan = styled.span`
  text-decoration: line-through;
`;

const PreBlock = styled.pre`
  margin: 0;
  font-family: ${FACE_STACKS.mono};
  background: ${tokens.color.surfaceAlt};
  padding: 4px 6px;
  border-radius: ${tokens.radius.md};
  white-space: pre-wrap;
`;

const Blockquote = styled.blockquote`
  margin: 0;
  padding: 0 0 0 8px;
  border-left: 2px solid ${tokens.color.borderEmphasis};
  color: ${tokens.color.fgMuted};
`;

const ChanChip = styled.span`
  color: ${tokens.palette.amber};
  font-weight: 500;
`;

const MentionSpan = styled.span<{ $self: boolean }>`
  color: ${(p) => (p.$self ? tokens.color.fgEmphasis : tokens.palette.violet)};
  font-weight: ${(p) => (p.$self ? 600 : 400)};
  background: ${(p) => (p.$self ? tokens.color.accentWash : 'transparent')};
  padding: ${(p) => (p.$self ? '0 2px' : '0')};
  border-radius: ${(p) => (p.$self ? tokens.radius.sm : '0')};
`;

/* ── Long-form article treatments (the wiki build) ───────────────── */

/**
 * Headings scale down rather than up: an article renders inside a
 * message column, so `h1` at browser default would tower over the
 * surrounding scene prose. The rule is one visible step per level plus
 * the anchor affordance, not a document type scale.
 */
const Heading = styled.div<{ $level: 1 | 2 | 3 }>`
  font-weight: 600;
  color: ${tokens.color.fg};
  font-size: ${(p) => (p.$level === 1 ? '1.25em' : p.$level === 2 ? '1.1em' : '1em')};
  margin: ${(p) => (p.$level === 1 ? '0.6em 0 0.3em' : '0.5em 0 0.2em')};
  border-bottom: ${(p) =>
    p.$level === 1 ? `1px solid ${tokens.color.border}` : 'none'};
  padding-bottom: ${(p) => (p.$level === 1 ? '2px' : '0')};
`;

const ArticleTable = styled.table`
  border-collapse: collapse;
  margin: 0.4em 0;
  /* An article table can be wider than the message column; scroll it
     rather than letting it push the whole log sideways. */
  display: block;
  max-width: 100%;
  overflow-x: auto;
`;

const TableCell = styled.td`
  border: 1px solid ${tokens.color.border};
  padding: 2px 6px;
  text-align: left;
  vertical-align: top;
`;

const TableHeaderCell = styled.th`
  border: 1px solid ${tokens.color.border};
  padding: 2px 6px;
  text-align: left;
  vertical-align: top;
  font-weight: 600;
  background: ${tokens.color.surfaceAlt};
`;

/**
 * A spoiler is the **appetite** half of the reveal model — content the
 * reader is entitled to but has declared they would rather opt into.
 * (Content above their *capability* was deleted server-side and never
 * arrives, so there is nothing to collapse.) Collapsed until clicked;
 * the level rides a data attribute for the stylesheet overlay.
 */
const SpoilerSpan = styled.span<{ $revealed: boolean }>`
  background: ${(p) =>
    p.$revealed ? 'transparent' : tokens.color.surfaceAlt};
  color: ${(p) => (p.$revealed ? 'inherit' : 'transparent')};
  border-radius: ${tokens.radius.sm};
  cursor: ${(p) => (p.$revealed ? 'inherit' : 'pointer')};
  transition: background 120ms ease;
  &:hover {
    background: ${(p) => (p.$revealed ? 'transparent' : tokens.color.actionBgHover)};
  }
`;

/**
 * Click-to-reveal wrapper for `<spoiler>`. A component rather than an
 * inline handler because it owns one bit of state per occurrence —
 * revealing one spoiler must not reveal the rest of the page.
 */
function Spoiler({
  level,
  children,
}: {
  level: string | undefined;
  children: React.ReactNode;
}): React.ReactElement {
  const [revealed, setRevealed] = React.useState(false);
  return (
    <SpoilerSpan
      $revealed={revealed}
      data-spoiler-level={level ?? '1'}
      title={revealed ? undefined : 'Hidden — click to reveal'}
      onClick={() => setRevealed(true)}
    >
      {children}
    </SpoilerSpan>
  );
}

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
  /**
   * How many `<list>` levels enclose the node being rendered. Absent
   * (or 0) at the top; each nested `<list>` renders its markers one
   * step further in. Carried here rather than as a wrapper element so
   * the chat templates' inline text flow is unaffected.
   */
  listDepth?: number;
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
    case 'highlight':
      // Styling wrapper, not clickable — tint by the palette color when
      // present, otherwise pass through unstyled.
      return (
        <HighlightSpan key={key} $tint={paletteFor(node.attrs.color)}>
          {children}
        </HighlightSpan>
      );
    case 'color':
      // Explicit literal-color tag — tint content by the palette
      // (friendly names resolved in paletteFor). When it wraps a
      // clickable label the inner color wins, so the affordance stays
      // clickable but takes the colour.
      return (
        <ColorSpan key={key} $tint={paletteFor(node.attrs.value)}>
          {children}
        </ColorSpan>
      );
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
      //
      // Nesting rides `ctx.listDepth`: a `<list>` inside an `<li>`
      // renders its markers indented one step, so an article's nested
      // list reads as nested rather than flat. Depth is carried in the
      // context (not a wrapper element) so the inline text flow — which
      // the chat templates depend on — is unchanged.
      const depth = ctx.listDepth ?? 0;
      const indent = '  '.repeat(depth);
      const inner: RenderCtx = { ...ctx, listDepth: depth + 1 };
      const items = node.children.filter(
        (c): c is Extract<MmlNode, { kind: 'tag' }> =>
          c.kind === 'tag' && c.tag === 'li',
      );
      return (
        <React.Fragment key={key}>
          {items.map((li, liIdx) => (
            <React.Fragment key={liIdx}>
              {depth > 0 && liIdx === 0 ? '\n' : ''}
              {indent}
              {ordered ? `${liIdx + 1}. ` : '- '}
              {renderNodes(li.children, inner)}
              {liIdx < items.length - 1 ? '\n' : ''}
            </React.Fragment>
          ))}
        </React.Fragment>
      );
    }
    case 'h1':
    case 'h2':
    case 'h3': {
      const level = Number(node.tag.slice(1)) as 1 | 2 | 3;
      return (
        <Heading key={key} $level={level} id={node.attrs.anchor}>
          {children}
        </Heading>
      );
    }
    case 'table':
      return (
        <ArticleTable key={key}>
          <tbody>{children}</tbody>
        </ArticleTable>
      );
    case 'tr':
      return <tr key={key}>{children}</tr>;
    case 'th':
      return <TableHeaderCell key={key}>{children}</TableHeaderCell>;
    case 'td':
      return <TableCell key={key}>{children}</TableCell>;
    case 'spoiler':
      return (
        <Spoiler key={key} level={node.attrs.level}>
          {children}
        </Spoiler>
      );
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
          onClick={(e) => handleAffordanceClick(e, cmd, ctx.onCommandClick)}
          onContextMenu={(e) => {
            e.preventDefault();
            copyCommand(cmd);
          }}
          onMouseEnter={() => ctx.onCommandPreview(cmd)}
          onMouseLeave={() => ctx.onCommandPreview(null)}
          title={`Click to send: ${cmd} · shift-click to copy`}
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

  // Identity tags (notably `<name>`) may carry a social-graph `color`
  // attribute (a boosted room occupant) — tint the span through the same
  // palette as the notification queue, keeping the click/preview behavior.
  return (
    <ClickableSpan
      key={key}
      $tint={paletteFor(node.attrs.color)}
      onClick={(e) => handleAffordanceClick(e, cmd, ctx.onCommandClick)}
      onContextMenu={(e) => {
        e.preventDefault();
        copyCommand(cmd);
      }}
      onMouseEnter={() => ctx.onCommandPreview(cmd)}
      onMouseLeave={() => ctx.onCommandPreview(null)}
      title={`Click to send: ${cmd} · shift-click to copy`}
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
