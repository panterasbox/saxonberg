/**
 * playerSlice — the ONE stream player's state (stream arrival D3).
 *
 * ⭐ There is one carrier iframe in the client, mounted above the phase
 * switch so no phase, layout or slot change reloads it (`StreamPlayer`).
 * This slice holds what decides where it sits and what it plays:
 *
 * - `playerSlot` — the rectangle a `PlayerSlot` registered (the front page's
 *   show tile, watch mode's stage, the phone's video box), or null → the
 *   dock in the corner.
 * - `playerMuted` — starts true on every document load; our control flips it
 *   (which reloads the embed once — owner-accepted).
 * - `playerClosed` — the visitor's ✕, for the visit (`sessionStorage`).
 * - `front` — the anonymous `/api/front` answer: the program the page shows
 *   and the name the client uses from then on (D14).
 */

import type { FrontResponse } from "@saxonberg/types";

/** Where a slot sits on the page, in viewport pixels. */
export interface PlayerRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PlayerSlice {
  playerSlot: PlayerRect | null;
  playerMuted: boolean;
  playerClosed: boolean;
  front: FrontResponse | null;
  setPlayerSlot: (rect: PlayerRect | null) => void;
  setPlayerMuted: (muted: boolean) => void;
  closePlayer: () => void;
  setFront: (front: FrontResponse | null) => void;
}

const CLOSED_KEY = "saxonberg.player.closed";

function readClosed(): boolean {
  try {
    return window.sessionStorage.getItem(CLOSED_KEY) === "1";
  } catch {
    return false;
  }
}

export const createPlayerSlice = (
  set: (partial: Partial<PlayerSlice> | ((state: PlayerSlice) => Partial<PlayerSlice>)) => void,
): PlayerSlice => ({
  playerSlot: null,
  playerMuted: true,
  playerClosed: readClosed(),
  front: null,
  setPlayerSlot: (rect) =>
    set((s) => {
      const a = s.playerSlot;
      if (a === rect) return {};
      if (
        a &&
        rect &&
        a.left === rect.left &&
        a.top === rect.top &&
        a.width === rect.width &&
        a.height === rect.height
      ) {
        return {};
      }
      return { playerSlot: rect };
    }),
  setPlayerMuted: (muted) => set({ playerMuted: muted }),
  closePlayer: () => {
    try {
      window.sessionStorage.setItem(CLOSED_KEY, "1");
    } catch {
      // Storage blocked: closed for this page only.
    }
    set({ playerClosed: true });
  },
  setFront: (front) => set({ front }),
});
