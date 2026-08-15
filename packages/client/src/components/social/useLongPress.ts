/**
 * `useLongPress` — the touch gesture that stands in for desktop hover.
 *
 * ⚠ **Pointer events, and it branches on the pointer TYPE, not on the
 * viewport width.** A touch laptop is a real thing and a narrow desktop
 * window is not a phone; keying the gesture to a breakpoint would give
 * the wrong one to both.
 *
 * A drag cancels: pressing and then moving is a scroll, and a feed you
 * cannot scroll without opening sheets is unusable. The move threshold
 * is generous because a finger always moves a little.
 */

import React from "react";

const HOLD_MS = 450;
const MOVE_TOLERANCE_PX = 10;

export interface LongPressHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
}

/**
 * @param onLongPress fired once when the hold completes.
 * @param enabled when false every handler is inert — used so a frame
 *        that cannot be reacted to never opens anything.
 */
export function useLongPress(
  onLongPress: () => void,
  enabled = true,
): LongPressHandlers {
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = React.useRef<{ x: number; y: number } | null>(null);

  const clear = React.useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    origin.current = null;
  }, []);

  React.useEffect(() => clear, [clear]);

  return {
    onPointerDown: (e) => {
      if (!enabled || e.pointerType === "mouse") return;
      origin.current = { x: e.clientX, y: e.clientY };
      timer.current = setTimeout(() => {
        timer.current = null;
        onLongPress();
      }, HOLD_MS);
    },
    onPointerMove: (e) => {
      const start = origin.current;
      if (start === null) return;
      const moved =
        Math.abs(e.clientX - start.x) > MOVE_TOLERANCE_PX ||
        Math.abs(e.clientY - start.y) > MOVE_TOLERANCE_PX;
      if (moved) clear();
    },
    onPointerUp: clear,
    onPointerCancel: clear,
  };
}
