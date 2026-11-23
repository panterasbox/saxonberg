/**
 * `useRadialGestures(stuffId, label)` — the "tell me about this" gesture
 * (navigation card substrate 10, lifted out of `EntityName`): a
 * right-click, or a mouse held for {@link LONG_PRESS_MS}, opens the
 * affordance radial on the thing. It opens a menu and runs nothing; the
 * primary click keeps sending whatever command it previews.
 *
 * ⭐ One implementation for every surface that names a thing — a name in
 * the scrollback and a way's door on the navigation card answer the same
 * gesture the same way.
 *
 * ⚠ A mouse hold only: on touch, a long press opens the tooltip sheet,
 * whose *actions* button opens the radial (tooltips W6).
 *
 * `stuffId` undefined = no gesture (every handler is undefined).
 */

import React from "react";
import { useStore } from "../../store/index";

export const LONG_PRESS_MS = 450;

export interface RadialGestureHandlers {
  onContextMenu?: (e: React.MouseEvent) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerUp?: () => void;
  onPointerLeave?: () => void;
}

export function useRadialGestures(stuffId: string | undefined, label: string): RadialGestureHandlers {
  const pressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const openRadial = React.useCallback(() => {
    if (!stuffId) return;
    useStore.getState().openRadial({ stuffId, displayName: label });
  }, [stuffId, label]);

  const cancelPress = React.useCallback(() => {
    if (pressTimer.current !== null) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  React.useEffect(() => cancelPress, [cancelPress]);

  if (!stuffId) return {};
  return {
    onContextMenu: (e) => {
      e.preventDefault();
      openRadial();
    },
    onPointerDown: (e) => {
      if (e.pointerType !== "mouse") return;
      cancelPress();
      pressTimer.current = setTimeout(openRadial, LONG_PRESS_MS);
    },
    onPointerUp: cancelPress,
    onPointerLeave: cancelPress,
  };
}
