/**
 * What a click sends — the ONE rule for every clickable that names a
 * thing (#91).
 *
 * ⭐ A click sends what a player would have typed: the verb and the
 * thing's word (`look stool`, `ring bell`). An ambiguous word asks which,
 * exactly as typing it would — the disambiguation prompt is the UI for
 * ambiguity, not an id nobody can read.
 *
 * ⭐⭐ An ACTION never names its target by a word: a word can quietly
 * resolve to some other thing in reach, and we never want to be wrong.
 * A click sends the verb alone and the game asks — "Ring what?" — with
 * its own list of what fits, and every noun on screen can answer
 * (PickMode), so the player who clicked `ring` on a card answers by
 * clicking the tip jar in that same card.
 *
 * A player who would rather skip the question turns on
 * `cockpit style links ids`: an action then sends the server's exact
 * `<verb> #<id>` — and only when the target really is the verb's first
 * argument (the server sends none otherwise).
 */

import type { AffordanceEntry, StyleOverlay } from "@saxonberg/types";
import { useStore } from "../../store/index";

export type LinkMode = "words" | "ids";

/** The player's choice, from the style overlay (default: words). */
export function useLinkMode(): LinkMode {
  return useStore((s) =>
    (s.clientState["style.overlay"] as StyleOverlay | undefined)?.links === "ids"
      ? "ids"
      : "words",
  );
}

/** `look` at one thing: by its word, or by id when it has none (or by choice). */
export function lookCommand(stuffId: string, keyword: string | undefined, mode: LinkMode): string {
  return mode === "words" && keyword ? `look ${keyword}` : `look #${stuffId}`;
}

/** What one action chip sends: the verb (the game asks), or the exact `#id` command. */
export function actionCommand(
  entry: AffordanceEntry,
  _stuffId: string | undefined,
  mode: LinkMode,
): string {
  return mode === "ids" && entry.command ? entry.command : entry.verb;
}
