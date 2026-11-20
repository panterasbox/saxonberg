/**
 * `useTip` — the one hook every tooltip anchor spreads (tooltips D8, N7).
 *
 * Hover (or focus) opens a tooltip; it locks after a short dwell or at
 * once on Shift, so the pointer can move into it; a term inside opens a
 * nested one. A locked stack stays where it opened and closes one level
 * per Esc, all at once on a press outside, or when the pointer has been
 * outside the root anchor and every tooltip for a moment.
 *
 * ⚠⚠ Hover INFORMS here; it does not preview. This hook never writes the
 * status bar's ghost preview and never opens the command sheet — a site
 * keeps its own `onMouseEnter → preview(cmd)` exactly as before, and
 * passes it in as `own` so the two run side by side.
 *
 * Timers are module-level: one pointer, one pending open, one grace.
 */

import React from "react";
import type { TooltipDoc } from "@saxonberg/types";
import { useStore } from "../../store/index";
import { useLongPress } from "../social/useLongPress";

/** What an anchor's tooltip shows: a document now, or one to resolve. */
export interface TipSpec {
  /** Names the subject (a re-hover of the same subject is not a reopen). */
  key: string;
  doc?: TooltipDoc;
  resolve?: () => Promise<TooltipDoc>;
}

/** Hover this long before a tooltip opens (nothing is sent before it). */
export const TIP_OPEN_MS = 200;
/** Open this long and the tooltip locks. */
export const TIP_LOCK_MS = 400;
/** Outside every tooltip this long and a locked stack closes. */
export const TIP_GRACE_MS = 300;

/**
 * The depth of the tooltip an anchor sits inside: −1 on the page, n inside
 * tooltip n. The layer provides it around each tooltip's content.
 */
export const TipDepthContext = React.createContext(-1);

let openTimer: ReturnType<typeof setTimeout> | null = null;
let graceTimer: ReturnType<typeof setTimeout> | null = null;

function clearOpen(): void {
  if (openTimer !== null) clearTimeout(openTimer);
  openTimer = null;
}

/** The pointer is inside a tooltip (or back on an anchor): keep the stack. */
export function cancelTipGrace(): void {
  if (graceTimer !== null) clearTimeout(graceTimer);
  graceTimer = null;
}

/** The pointer left: close the whole stack unless it comes back in time. */
export function scheduleTipGrace(): void {
  cancelTipGrace();
  graceTimer = setTimeout(() => {
    graceTimer = null;
    useStore.getState().closeAllTips();
  }, TIP_GRACE_MS);
}

/** Open `spec`'s tooltip at `depth` over `anchor`; resolves it if needed. */
export function openTipNow(
  depth: number,
  anchor: Element,
  spec: TipSpec,
  locked = false,
  touch = false,
): void {
  const st = useStore.getState();
  const here = st.tipStack.find((e) => e.depth === depth);
  if (here && here.key === spec.key && here.anchor === anchor) {
    if (locked) st.lockTips(here.id);
    return;
  }
  const id = st.openTip(depth, anchor, spec.key, spec.doc ?? null, touch);
  if (locked) st.lockTips(id);
  if (!spec.doc && spec.resolve) {
    spec
      .resolve()
      .then((doc) => useStore.getState().resolveTip(id, doc))
      .catch(() => useStore.getState().resolveTip(id, { miss: "Nothing to show." }));
  }
}

/**
 * Is this element (or an ancestor) a tooltip anchor? The pointer over ANY
 * anchor is the pointer staying: it is about to open that anchor's tooltip,
 * and the stack it is leaving must not be closed out from under it.
 */
export function onTipAnchor(el: EventTarget | null): boolean {
  return el instanceof Element && el.closest("[data-tip-anchor]") !== null;
}

/** Is this element inside any open tooltip (or the phone's tip sheet)? */
export function insideTip(el: EventTarget | null): boolean {
  return el instanceof Element && el.closest("[data-tip-panel]") !== null;
}

export interface AnchorHandlers {
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onFocus?: (e: React.FocusEvent) => void;
  onBlur?: (e: React.FocusEvent) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  onPointerCancel?: (e: React.PointerEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Handlers for one anchor. `spec` null = no tooltip (handlers pass through
 * to `own`). Merge-safe: every handler of `own` still runs.
 */
export function useTip(
  spec: TipSpec | null,
  own: AnchorHandlers = {},
): Required<AnchorHandlers> & { "data-tip-anchor"?: "" } {
  const parent = React.useContext(TipDepthContext);
  const depth = parent + 1;
  const specRef = React.useRef(spec);
  specRef.current = spec;
  // A long press opened the sheet: swallow the click its release makes.
  const swallowClick = React.useRef(false);
  const anchorRef = React.useRef<Element | null>(null);

  const press = useLongPress(() => {
    const s = specRef.current;
    if (!s || !anchorRef.current) return;
    swallowClick.current = true;
    openTipNow(depth, anchorRef.current, s, true, true);
  }, spec !== null);

  return {
    ...(spec ? { "data-tip-anchor": "" as const } : {}),
    onMouseEnter: (e) => {
      own.onMouseEnter?.(e);
      const s = specRef.current;
      if (!s) return;
      cancelTipGrace();
      clearOpen();
      const anchor = e.currentTarget;
      openTimer = setTimeout(() => {
        openTimer = null;
        openTipNow(depth, anchor, s);
      }, TIP_OPEN_MS);
    },
    onMouseLeave: (e) => {
      own.onMouseLeave?.(e);
      if (!specRef.current) return;
      clearOpen();
      const entry = useStore.getState().tipStack.find((t) => t.depth === depth);
      if (!entry || entry.anchor !== e.currentTarget) return;
      if (insideTip(e.relatedTarget)) return;
      if (entry.locked) scheduleTipGrace();
      else useStore.getState().closeTipsFrom(depth);
    },
    onFocus: (e) => {
      own.onFocus?.(e);
      const s = specRef.current;
      if (!s) return;
      // Keyboard: open at once, locked — there is no pointer to dwell.
      openTipNow(depth, e.currentTarget, s, true);
    },
    onBlur: (e) => {
      own.onBlur?.(e);
      if (!specRef.current) return;
      if (insideTip(e.relatedTarget)) return;
      const entry = useStore.getState().tipStack.find((t) => t.depth === depth);
      if (entry && entry.anchor === e.currentTarget) useStore.getState().closeTipsFrom(depth);
    },
    onPointerDown: (e) => {
      own.onPointerDown?.(e);
      anchorRef.current = e.currentTarget;
      swallowClick.current = false;
      if (specRef.current && e.pointerType !== "mouse") {
        // The anchor's hold is the tooltip's — the row under it must not
        // also open its line menu.
        e.stopPropagation();
      }
      press.onPointerDown(e);
    },
    onPointerMove: (e) => {
      own.onPointerMove?.(e);
      press.onPointerMove(e);
    },
    onPointerUp: (e) => {
      own.onPointerUp?.(e);
      press.onPointerUp();
    },
    onPointerCancel: (e) => {
      own.onPointerCancel?.(e);
      press.onPointerCancel();
    },
    onClick: (e) => {
      if (swallowClick.current) {
        swallowClick.current = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      own.onClick?.(e);
    },
  };
}
