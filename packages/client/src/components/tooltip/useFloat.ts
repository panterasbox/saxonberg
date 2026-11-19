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
}

export interface Float {
  /** Attach to the floating element. */
  ref: (el: HTMLElement | null) => void;
  /** Spread on the floating element. Hidden until placed. */
  style: React.CSSProperties;
}

export function useFloat(anchor: Element | null, opts: FloatOptions = {}): Float {
  const { placement = "bottom-start", onDismiss, maxHeight = 420 } = opts;
  const [floating, setFloating] = React.useState<HTMLElement | null>(null);
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null);

  React.useLayoutEffect(() => {
    if (!anchor || !floating) return;
    let cancelled = false;
    void computePosition(anchor, floating, {
      strategy: "fixed",
      placement,
      middleware: [
        offset(6),
        flip({ padding: 8 }),
        shift({ padding: 8 }),
        size({
          padding: 8,
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
  }, [anchor, floating, placement, maxHeight]);

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
