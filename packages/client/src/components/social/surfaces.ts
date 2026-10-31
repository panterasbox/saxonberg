/**
 * The four surfaces a subject can light, and how the client names them.
 *
 * ⭐ **Switching surfaces changes the RENDERING, not the room.** One
 * audience, one membership, one invite list, whichever surface you are
 * looking at — which is the whole reason the tabs are not navigation and
 * the reason chat and forum stopped being separate products.
 *
 * ⭐ **ORDERED vs OPEN is one axis across both.** A subject's forum and
 * its chat make the same choice: *ordered* means a procedure governs
 * what may be said and when — a typed claim-graph that matures to a
 * vote, or rules of order with a recognized speaker. *Open* means no
 * procedure: say what you like, and others rank it.
 *
 * The old names split that one idea into four unrelated words
 * (`argument` / `popularity` / `rules-of-order` / `free`), which hid
 * that a subject choosing an argument board and a rules-of-order chat
 * had made the SAME decision twice.
 *
 * ⚠ `ordered-chat` is **parked server-side**, not merely unbuilt here:
 * `chat on --ordered` documents itself as deferred. It stays in the
 * vocabulary so the client can show it as unavailable — a control that
 * reliably refuses is worse than one that says it is not there yet.
 */

import type { SubjectSurfaceName } from "@saxonberg/types";
import { tokens } from "../ui";

/** Vocabulary order — deliberation, then chatter, then the live rooms. */
export const SURFACE_ORDER: readonly SubjectSurfaceName[] = [
  "ordered-forum",
  "open-forum",
  "open-chat",
  "ordered-chat",
];

export const SURFACE_LABEL: Record<SubjectSurfaceName, string> = {
  "ordered-forum": "Ordered",
  "open-forum": "Open",
  "open-chat": "Chat",
  "ordered-chat": "Ordered chat",
};

/**
 * The rail's four-character chip.
 *
 * ⚠ Explicit, not `label.slice(0, 4)`. Under the old names slicing
 * happened to work; under these, "Ordered" and "Ordered chat" both cut
 * to `ORDE`, and a subject lighting both would show the same chip twice
 * with no way to tell which was which.
 */
export const SURFACE_CHIP: Record<SubjectSurfaceName, string> = {
  "ordered-forum": "ORDR",
  "open-forum": "OPEN",
  "open-chat": "CHAT",
  "ordered-chat": "RULE",
};

export const SURFACE_HUE: Record<SubjectSurfaceName, string> = {
  // ⚠ `danger` is the ember role, used here because an ordered board is
  // where the unanswered objections live — the one surface that carries
  // a queue. Not an alarm; the accent-on-field warmth.
  "ordered-forum": tokens.color.danger,
  "open-forum": tokens.color.accent,
  "open-chat": tokens.color.info,
  // Parked, so it reads as absent rather than as another live surface.
  "ordered-chat": tokens.color.fgMuted,
};

/**
 * Surfaces a player can actually light up right now.
 *
 * ⚠ `ordered-chat` is absent by SERVER state, not by client taste. When it
 * unparks, this list is the one edit.
 */
export const LIGHTABLE_SURFACES: readonly SubjectSurfaceName[] = [
  "ordered-forum",
  "open-forum",
  "open-chat",
];

/**
 * The command that lights a surface up on a subject.
 *
 * Every one of these is a real verb a player could type — the client is
 * composing commands, never calling a private path. `forum on` takes
 * `--ordered` for the claim-graph organizer; `chat on` takes the same
 * `--ordered` for the parked rules-of-order procedure — one word, both
 * axes, which is the point of the rename.
 */
export function lightSurfaceCommand(
  handle: string,
  surface: SubjectSurfaceName,
): string | null {
  switch (surface) {
    case "open-forum":
      return `forum on ${handle}`;
    case "ordered-forum":
      return `forum on ${handle} --ordered`;
    case "open-chat":
      return `chat on ${handle}`;
    case "ordered-chat":
      // Parked server-side. Returning null is what makes the control
      // render as unavailable rather than as a button that will refuse.
      return null;
  }
}

/** Whether a surface renders a board (vs a live chat log). */
export function isForumSurface(surface: SubjectSurfaceName): boolean {
  return surface === "ordered-forum" || surface === "open-forum";
}
