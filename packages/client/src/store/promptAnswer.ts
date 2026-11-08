/**
 * Answering a pending prompt — the one path for every way of answering:
 * the command bar, a prompt chip, or a noun clicked anywhere on screen
 * while a "Ring what?" prompt is open (pick mode).
 */

import { nanoid } from "nanoid";
import { useStore } from "./index";
import { websocketClient } from "../services/websocket";

/**
 * Render the player-facing label for a prompt response. For chip-
 * driven kinds we resolve the wire response back to the human-
 * readable label so the terminal scrollback reads `Which sword? →
 * rusty sword` instead of `Which sword? → <stuffId>`. `pickedLabel`
 * names a thing picked from elsewhere on screen, which the prompt's
 * own list may not hold. Returns `null` when the prompt isn't in the
 * store (already dismissed by the time we render), since the line
 * wouldn't have context.
 */
export function formatResponseEcho(
  promptId: string,
  response: string,
  pickedLabel?: string,
): string | null {
  const entry = useStore
    .getState()
    .prompts.find((p) => p.promptId === promptId);
  if (!entry) return null;
  let resolved: string;
  switch (entry.kind) {
    case "text":
    case "compose":
      resolved = response;
      break;
    case "confirm":
      resolved = response === "yes" ? "Yes" : "No";
      break;
    case "choice": {
      const hit = entry.choices.find((c) => c.response === response);
      resolved = hit ? hit.label : response;
      break;
    }
    case "mql-object": {
      const hit = entry.matches.find((m) => m.stuffId === response);
      resolved = hit ? hit.displayName : pickedLabel ?? response;
      break;
    }
    case "mql-many": {
      try {
        const ids: unknown = JSON.parse(response);
        if (!Array.isArray(ids)) {
          resolved = response;
          break;
        }
        const names = ids.map((id) => {
          const hit = entry.matches.find((m) => m.stuffId === id);
          return hit ? hit.displayName : String(id);
        });
        resolved = names.join(", ");
      } catch {
        resolved = response;
      }
      break;
    }
    default: {
      const _exhaustive: never = entry;
      resolved = response;
    }
  }
  return `${entry.label} → ${resolved}`;
}

/**
 * Send a response to a pending prompt. Emits the resolution echo line
 * locally at send time — prompt responses don't ride the
 * `shell.diagnostic` echo channel, so the snapshot-pairing path doesn't
 * apply here.
 */
export function answerPrompt(promptId: string, response: string, pickedLabel?: string): void {
  if (!websocketClient.isConnected()) {
    console.warn("Cannot send prompt response: not connected");
    return;
  }
  const echo = formatResponseEcho(promptId, response, pickedLabel);
  if (echo) {
    useStore.getState().appendFrame({
      id: `prompt-echo-${nanoid()}`,
      topic: "shell.diagnostic",
      body: echo,
      timestamp: Date.now(),
    });
  }
  websocketClient.sendPromptResponse(promptId, response);
}
