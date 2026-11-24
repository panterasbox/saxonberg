/**
 * `useFloat` — place a floating element beside its anchor, once, and
 * dismiss it on a press outside (tooltips D1, N6).
 *
 * The client's ONE positioner: the tooltip layer, the gutter's action menu
 * and the tab strip's delete confirmation all use it, so none of them
 * keeps its own placement or click-outside code.
 *
 * ⭐ Computed ONCE when the floating element mounts — a locked tooltip
 * stays where it opened and never follows the pointer or the scroll.
 * `flip` + `shift` keep it on screen without covering the anchor; `size`
 * caps its height to the room available, past which it scrolls.
 *
 * Positioning is `fixed`, in the anchor's own document (a card popped out
 * into its own window keeps its tooltips there).
 */

import React from "react";
import {
  computePosition,
  flip,
  offset,
  shift,
  size,
  type Placement,
} from "@floating-ui/react-dom";

export interface FloatOptions {
  placement?: Placement;
  /** Called on a pointer press outside both the anchor and the float. */
  onDismiss?: () => void;
  /** The tallest it may grow before scrolling (px). */
  maxHeight?: number;
  /**
   * Changes when the content arrives (a resolving tooltip opens on "…").
   * Placement is computed once for the content the float actually shows —
   * never again after that, so a locked tooltip stays where it opened.
   */
  contentKey?: unknown;
}

export interface Float {
  /** Attach to the floating element. */
  ref: (el: HTMLElement | null) => void;
  /** Spread on the floating element. Hidden until placed. */
  style: React.CSSProperties;
}

export function useFloat(anchor: Element | null, opts: FloatOptions = {}): Float {
  const { placement = "bottom-start", onDismiss, maxHeight = 420, contentKey } = opts;
  const [floating, setFloating] = React.useState<HTMLElement | null>(null);
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null);

  React.useLayoutEffect(() => {
    if (!anchor || !floating) return;
    // Measure the content at its natural height — a cap left by the last
    // placement would hide the overflow `flip` exists to see.
    floating.style.maxHeight = "";
    let cancelled = false;
    // ⚠ The floating box is FIXED and portaled to the body, so the room it
    // has is the VIEWPORT — never the anchor's scroll container. Measuring
    // against the container (floating-ui's default) made a tooltip on a verb
    // inside a short card flip right and then shift back left ONTO its own
    // anchor, so the click landed on the tooltip (the which walk, 2026-11-24).
    const boundary = anchor.ownerDocument.documentElement;
    void computePosition(anchor, floating, {
      strategy: "fixed",
      placement,
      middleware: [
        offset(6),
        flip({ padding: 8, boundary, fallbackPlacements: ["top-start", "right-start", "left-start"] }),
        shift({ padding: 8, boundary }),
        size({
          padding: 8,
          boundary,
          apply({ availableHeight, elements }) {
            elements.floating.style.maxHeight = `${Math.max(120, Math.min(maxHeight, availableHeight))}px`;
          },
        }),
      ],
    }).then(({ x, y }) => {
      if (!cancelled) setPos({ x, y });
    });
    return () => {
      cancelled = true;
    };
  }, [anchor, floating, placement, maxHeight, contentKey]);

  const dismiss = React.useRef(onDismiss);
  dismiss.current = onDismiss;
  React.useEffect(() => {
    if (!anchor || !floating || !dismiss.current) return;
    const doc = anchor.ownerDocument;
    const onDown = (e: Event) => {
      const t = e.target as Node | null;
      if (t && (floating.contains(t) || anchor.contains(t))) return;
      dismiss.current?.();
    };
    doc.addEventListener("pointerdown", onDown, true);
    return () => doc.removeEventListener("pointerdown", onDown, true);
  }, [anchor, floating]);

  return {
    ref: setFloating,
    style: {
      position: "fixed",
      left: pos?.x ?? 0,
      top: pos?.y ?? 0,
      visibility: pos ? "visible" : "hidden",
    },
  };
}
