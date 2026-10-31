/**
 * What a click sends — the ONE rule for every clickable that names a
 * thing (#91).
 *
 * ⭐ A click sends what a player would have typed: the verb and the
 * thing's word (`look stool`, `ring bell`). An ambiguous word asks which,
 * exactly as typing it would — the disambiguation prompt is the UI for
 * ambiguity, not an id nobody can read.
 *
 * ⚠ An action's command is the SERVER's, never composed here: the
 * affordance probe binds the target into the verb's real argument slot
 * and sends back the command it validated. A verb whose target is not
 * its first argument comes back with no command, and the click sends
 * the verb alone so the dispatcher asks for what it needs — appending
 * the target would put it in the wrong slot.
 *
 * A player who would rather never be asked turns on
 * `cockpit style links ids`, and every click names its target by `#id`.
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

/** What one action chip sends. */
export function actionCommand(
  entry: AffordanceEntry,
  stuffId: string | undefined,
  mode: LinkMode,
): string {
  if (!entry.command) return entry.verb;
  if (mode === "ids" && stuffId && entry.command !== entry.verb) {
    return `${entry.verb} #${stuffId}`;
  }
  return entry.command;
}
