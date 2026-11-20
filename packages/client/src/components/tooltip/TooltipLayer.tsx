/**
 * TooltipLayer — draws the open tooltip stack (tooltips D2, D8, N5).
 *
 * Mounted ONCE at the top of the app. Each stack entry floats beside its
 * anchor (`useFloat`), or — when the stack was opened by a long press —
 * the top of the stack draws as a bottom sheet with a back control.
 *
 * ⭐⭐ It renders a document and the stack's own navigation (breadcrumb,
 * pin, back) and NOTHING a card has: no dock, no minimize, no
 * pin-in-place, no refresh. Pin runs the command that opens the card the
 * tooltip previews — a card is born from a command, never from here.
 *
 * Keys, while a stack is open: Esc closes one level; Shift locks.
 * A press outside every tooltip closes them all.
 */

import React from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import type { TooltipDoc } from "@saxonberg/types";
import { useStore } from "../../store/index";
import type { TipEntry } from "../../store/tooltipSlice";
import { DocView, type DocLinkHandlers } from "../doc/blocks";
import { Icon, tokens } from "../ui";
import { useFloat } from "./useFloat";
import {
  TIP_LOCK_MS,
  TipDepthContext,
  cancelTipGrace,
  insideTip,
  onTipAnchor,
  openTipNow,
  scheduleTipGrace,
} from "./useTip";
import { termTip } from "../../services/tooltipSource";
import { Tip } from "./Tip";

const Panel = styled.div`
  z-index: 80;
  box-sizing: border-box;
  width: 340px;
  max-width: calc(100vw - 16px);
  overflow-y: auto;
  background: ${tokens.color.surface};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.borderEmphasis};
  border-radius: ${tokens.radius.md};
  box-shadow: 0 4px 16px ${tokens.color.shadow};
  padding: ${tokens.space.md} ${tokens.space.lg};
  font-family: ${tokens.font.family};
  font-size: 14px;
  white-space: normal;
  text-align: left;
`;

const Scrim = styled.div`
  position: fixed;
  inset: 0;
  z-index: 80;
  background: ${tokens.color.scrim};
`;

const Sheet = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 81;
  max-height: 70vh;
  overflow-y: auto;
  background: ${tokens.color.surface};
  color: ${tokens.color.fg};
  border-top: 1px solid ${tokens.color.borderEmphasis};
  border-radius: ${tokens.radius.md} ${tokens.radius.md} 0 0;
  padding: ${tokens.space.lg} ${tokens.space.xl} ${tokens.space.xxl};
  font-family: ${tokens.font.family};
  font-size: 14px;
`;

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  margin-bottom: ${tokens.space.sm};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

const Crumb = styled.button`
  all: unset;
  cursor: pointer;
  color: ${tokens.color.fgDim};
  &:hover,
  &:focus-visible {
    color: ${tokens.color.fg};
    text-decoration: underline;
  }
`;

const BarButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.space.xs};
  background: ${tokens.color.actionBg};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  padding: 1px ${tokens.space.sm};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  cursor: pointer;
  &:hover {
    background: ${tokens.color.actionBgHover};
  }
`;

const Loading = styled.div`
  color: ${tokens.color.fgMuted};
`;

export interface TooltipLayerProps extends DocLinkHandlers {}

function crumbName(doc: TooltipDoc | null): string {
  return doc?.header?.name ?? "…";
}

/** The stack's own navigation: crumbs, back (sheet), pin. */
function StackBar({
  stack,
  entry,
  sheet,
  onPin,
}: {
  stack: TipEntry[];
  entry: TipEntry;
  sheet: boolean;
  onPin: (command: string) => void;
}): React.ReactElement | null {
  const closeFrom = useStore((s) => s.closeTipsFrom);
  const showCrumbs = entry.depth > 0 && (entry.locked || sheet);
  const pin = entry.doc?.pin;
  // ⭐ On a phone the long press that opens a thing's tooltip is the press
  // that used to open its radial, so the sheet keeps the radial one tap
  // away (tooltips W6). A desktop has right-click for it.
  const radialFor = sheet && entry.key.startsWith("thing:") && entry.doc && !entry.doc.miss
    ? entry.key.slice("thing:".length)
    : null;
  if (!showCrumbs && !pin && !sheet) return null;
  return (
    <Bar data-testid="tip-bar">
      {sheet && entry.depth > 0 ? (
        <BarButton type="button" data-testid="tip-back" onClick={() => closeFrom(entry.depth)}>
          ‹ back
        </BarButton>
      ) : null}
      {showCrumbs ? (
        <span data-testid="tip-crumbs">
          {stack
            .filter((e) => e.depth < entry.depth)
            .map((e) => (
              <React.Fragment key={e.id}>
                <Crumb type="button" onClick={() => closeFrom(e.depth + 1)}>
                  {crumbName(e.doc)}
                </Crumb>
                {" › "}
              </React.Fragment>
            ))}
          <span>{crumbName(entry.doc)}</span>
        </span>
      ) : null}
      <span style={{ flex: 1 }} />
      {radialFor ? (
        <BarButton
          type="button"
          data-testid="tip-actions"
          onClick={() => {
            const name = entry.doc?.header?.name ?? "";
            useStore.getState().closeAllTips();
            useStore.getState().openRadial({ stuffId: radialFor, displayName: name });
          }}
        >
          actions
        </BarButton>
      ) : null}
      {pin ? (
        <BarButton type="button" data-testid="tip-pin" onClick={() => onPin(pin)}>
          <Icon name="card.pin" label="pin" decorative size={12} />
          pin
        </BarButton>
      ) : null}
    </Bar>
  );
}

function Content({
  entry,
  links,
}: {
  entry: TipEntry;
  links: DocLinkHandlers;
}): React.ReactElement {
  return (
    <TipDepthContext.Provider value={entry.depth}>
      {entry.doc ? (
        <DocView doc={entry.doc} {...links} />
      ) : (
        <Loading data-testid="tip-loading">…</Loading>
      )}
    </TipDepthContext.Provider>
  );
}

function FloatingTip({
  entry,
  stack,
  links,
  onPin,
}: {
  entry: TipEntry;
  stack: TipEntry[];
  links: DocLinkHandlers;
  onPin: (command: string) => void;
}): React.ReactElement {
  const lockTips = useStore((s) => s.lockTips);
  // Placed when it opens AND once more when its document arrives.
  const float = useFloat(entry.anchor, { contentKey: entry.doc !== null });
  // Dwell locks it, so the pointer can travel into it.
  React.useEffect(() => {
    if (entry.locked) return;
    const t = setTimeout(() => lockTips(entry.id), TIP_LOCK_MS);
    return () => clearTimeout(t);
  }, [entry.id, entry.locked, lockTips]);
  return createPortal(
    <Panel
      ref={float.ref}
      style={float.style}
      role="tooltip"
      data-tip-panel=""
      data-testid="tooltip"
      data-depth={entry.depth}
      data-locked={entry.locked ? "true" : "false"}
      onMouseEnter={cancelTipGrace}
      onMouseLeave={(e) => {
        if (insideTip(e.relatedTarget)) return;
        if (entry.anchor.contains(e.relatedTarget as Node | null)) return;
        scheduleTipGrace();
      }}
    >
      <StackBar stack={stack} entry={entry} sheet={false} onPin={onPin} />
      <Content entry={entry} links={links} />
    </Panel>,
    entry.anchor.ownerDocument.body,
  );
}

function SheetTip({
  entry,
  stack,
  links,
  onPin,
}: {
  entry: TipEntry;
  stack: TipEntry[];
  links: DocLinkHandlers;
  onPin: (command: string) => void;
}): React.ReactElement {
  const closeAll = useStore((s) => s.closeAllTips);
  // ⭐ In the sheet a tap on a TERM pushes its tooltip onto the stack (a
  // phone has no hover to nest by); any other link runs as it would.
  const sheetLinks: DocLinkHandlers = {
    ...links,
    onCommandClick: (cmd) => {
      const term = termTip(cmd);
      if (term) openTipNow(entry.depth + 1, entry.anchor, term, true, true);
      else links.onCommandClick(cmd);
    },
  };
  return createPortal(
    <>
      <Scrim data-testid="tip-scrim" onClick={closeAll} />
      <Sheet
        role="dialog"
        aria-label={crumbName(entry.doc)}
        data-tip-panel=""
        data-testid="tip-sheet"
        data-depth={entry.depth}
      >
        <StackBar stack={stack} entry={entry} sheet onPin={onPin} />
        <Content entry={entry} links={sheetLinks} />
      </Sheet>
    </>,
    entry.anchor.ownerDocument.body,
  );
}

export function TooltipLayer({ onCommandClick, onCommandPreview }: TooltipLayerProps): React.ReactElement | null {
  const stack = useStore((s) => s.tipStack);
  const open = stack.length > 0;

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const st = useStore.getState();
      if (st.tipStack.length === 0) return;
      if (e.key === "Escape") {
        const top = st.tipStack[st.tipStack.length - 1]!;
        st.closeTipsFrom(top.depth);
        e.stopPropagation();
      } else if (e.key === "Shift") {
        st.lockTips();
      }
    };
    const onDown = (e: Event) => {
      if (insideTip(e.target)) return;
      const st = useStore.getState();
      // A press on the root anchor is that anchor's own click.
      if (st.tipStack[0]?.anchor.contains(e.target as Node | null)) return;
      st.closeAllTips();
    };
    // ⭐ The layer watches the pointer itself while a stack is open (found
    // by the walk): an anchor re-rendered away fires no "left", so a locked
    // stack would otherwise stay open forever. Outside every tooltip and the
    // root anchor → the grace runs; an anchor gone from the page → closed.
    const onMove = (e: Event) => {
      const st = useStore.getState();
      const root = st.tipStack[0];
      if (!root) return;
      if (!root.anchor.isConnected) {
        st.closeAllTips();
        return;
      }
      if (root.touch) return;
      // ⭐ Over any anchor is staying (owner, review): moving from one link to
      // the next must not let the old stack's grace close the new tooltip.
      if (insideTip(e.target) || onTipAnchor(e.target) || root.anchor.contains(e.target as Node | null)) {
        cancelTipGrace();
      }
      else if (st.tipStack.some((t) => t.locked)) scheduleTipGrace();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointermove", onMove, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointermove", onMove, true);
    };
  }, [open]);

  if (!open) return null;

  const onPin = (command: string) => {
    useStore.getState().closeAllTips();
    onCommandClick(command);
  };
  const links: DocLinkHandlers = { onCommandClick, onCommandPreview };
  const sheet = stack[0]!.touch;

  if (sheet) {
    // The sheet shows the top of the stack; back walks down it.
    const top = stack[stack.length - 1]!;
    return <SheetTip key={top.id} entry={top} stack={stack} links={links} onPin={onPin} />;
  }
  return (
    <>
      {stack.map((entry) => (
        <FloatingTip key={entry.id} entry={entry} stack={stack} links={links} onPin={onPin} />
      ))}
    </>
  );
}
