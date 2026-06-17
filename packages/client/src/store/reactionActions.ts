/**
 * reactionActions — the IO boundary for the reactions slice, peer to
 * `consoleActions`. The store layer stays pure state; this file wires
 * the `reaction-delta` / `reaction-expand-result` envelopes into store
 * actions and offers the two outbound ops (react via a `react --msg`
 * command, and the expand pull).
 *
 * Counts are authoritative: `applyReactionDelta` REPLACES bucket
 * counts, it never sums. See docs/subsystems/reactions.md.
 */

import type {
  ReactionDeltaEnvelope,
  ReactionExpandResultEnvelope,
} from "@saxonberg/types";
import { useStore } from "./index";
import { websocketClient } from "../services/websocket";

let installed = false;

/**
 * Register the reaction envelope handlers exactly once. Call from app
 * bootstrap alongside the other `onEnvelope` registrations.
 */
export function registerReactionHandlers(): void {
  if (installed) return;
  installed = true;
  websocketClient.onEnvelope("reaction-delta", (env) => {
    const delta = env as ReactionDeltaEnvelope;
    useStore.getState().applyReactionDelta(delta.acts);
  });
  websocketClient.onEnvelope("reaction-expand-result", (env) => {
    const result = env as ReactionExpandResultEnvelope;
    useStore
      .getState()
      .applyReactionExpandResult(result.commandId, result.reactors);
  });
}

// Reaction COMMANDS (`react --msg <#> ;<verb>`) are built and dispatched
// by the ReactionBar widget through the shared command-bus handlers
// (`onCommandClick` / `onCommandPreview`) — like every other clickable
// affordance, so they preview in the command bar before sending. They
// are deliberately NOT sent directly from here.

/** Pull the full reactor-set behind one act (expand). */
export function expandReactors(commandId: string, requestId: string): void {
  websocketClient.send({
    type: "reaction-expand",
    payload: { type: "reaction-expand", requestId, commandId },
  });
}
