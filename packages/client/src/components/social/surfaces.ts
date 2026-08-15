/**
 * The four surfaces a subject can light, and how the client names them.
 *
 * ⭐ **Switching surfaces changes the RENDERING, not the room.** One
 * audience, one membership, one invite list, whichever surface you are
 * looking at — which is the whole reason the tabs are not navigation and
 * the reason chat and forum stopped being separate products.
 *
 * ⚠ `rules-chat` is **parked server-side**, not merely unbuilt here:
 * `chat on --rules` documents itself as deferred. It stays in the
 * vocabulary so the client can show it as unavailable — a control that
 * reliably refuses is worse than one that says it is not there yet.
 */

import type { SubjectSurfaceName } from "@saxonberg/types";
import { tokens } from "../ui";

/** Vocabulary order — deliberation, then chatter, then the live rooms. */
export const SURFACE_ORDER: readonly SubjectSurfaceName[] = [
  "argument-forum",
  "popularity-forum",
  "free-chat",
  "rules-chat",
];

export const SURFACE_LABEL: Record<SubjectSurfaceName, string> = {
  "argument-forum": "Argument",
  "popularity-forum": "Popularity",
  "free-chat": "Chat",
  "rules-chat": "Rules chat",
};

export const SURFACE_HUE: Record<SubjectSurfaceName, string> = {
  // ⚠ `danger` is the ember role, used here because an argument board is
  // where the unanswered objections live — the one surface that carries
  // a queue. Not an alarm; the accent-on-field warmth.
  "argument-forum": tokens.color.danger,
  "popularity-forum": tokens.color.accent,
  "free-chat": tokens.color.info,
  // Parked, so it reads as absent rather than as another live surface.
  "rules-chat": tokens.color.fgMuted,
};

/**
 * Surfaces a player can actually light up right now.
 *
 * ⚠ `rules-chat` is absent by SERVER state, not by client taste. When it
 * unparks, this list is the one edit.
 */
export const LIGHTABLE_SURFACES: readonly SubjectSurfaceName[] = [
  "argument-forum",
  "popularity-forum",
  "free-chat",
];

/**
 * The command that lights a surface up on a subject.
 *
 * Every one of these is a real verb a player could type — the client is
 * composing commands, never calling a private path. `forum on` takes
 * `--argument` for the claim-graph organizer; `chat on` takes `--rules`
 * for the parked procedure.
 */
export function lightSurfaceCommand(
  handle: string,
  surface: SubjectSurfaceName,
): string | null {
  switch (surface) {
    case "popularity-forum":
      return `forum on ${handle}`;
    case "argument-forum":
      return `forum on ${handle} --argument`;
    case "free-chat":
      return `chat on ${handle}`;
    case "rules-chat":
      // Parked server-side. Returning null is what makes the control
      // render as unavailable rather than as a button that will refuse.
      return null;
  }
}

/** Whether a surface renders a board (vs a live chat log). */
export function isForumSurface(surface: SubjectSurfaceName): boolean {
  return surface === "argument-forum" || surface === "popularity-forum";
}
