/**
 * onAir — what the streamer's own client does while a broadcast shows it
 * (broadcast-ready D8, W4).
 *
 * ⭐ The client redacts ONLY on the server's stamps — a frame tagged
 * `privacy:private`, a card flagged `private` — and only while its own
 * `stream.state` phase is on air (`starting`, `live`, `ending`). In
 * `standby` and `offline` nothing is on air, so everything renders: that
 * is what a privacy standby is for. It never guesses from a topic.
 */

import { useEffect } from "react";
import { useStore } from "../../store";
import { websocketClient } from "../../services/websocket";
import type { StreamForeground } from "@saxonberg/types";

/** The frame tag the server stamps on every private frame. */
export const PRIVATE_TAG = "privacy:private";

/** The phases a broadcast shows the client in. */
const ON_AIR = new Set(["starting", "live", "ending"]);

/** Is `phase` one the broadcast shows? */
export function isOnAirPhase(phase: unknown): boolean {
  return typeof phase === "string" && ON_AIR.has(phase);
}

/** Did the server stamp this frame private? */
export function isPrivateFrame(tags: readonly string[] | undefined): boolean {
  return tags?.includes(PRIVATE_TAG) === true;
}

/** Is this client on air right now (its own `stream.state`)? */
export function useOnAir(): boolean {
  return useStore((s) =>
    isOnAirPhase((s.clientState["stream.state"] as { phase?: unknown } | null | undefined)?.phase),
  );
}

/** Where this client is: in front, another tab, another app (D6). */
export function currentForeground(doc: Pick<Document, "hidden" | "hasFocus">): StreamForeground {
  if (doc.hidden) return "other-tab";
  return doc.hasFocus() ? "saxonberg" : "other-app";
}

/** Is a stream up at all (any phase but offline)? */
function useStreamUp(): boolean {
  return useStore((s) => {
    const phase = (s.clientState["stream.state"] as { phase?: unknown } | null | undefined)?.phase;
    return typeof phase === "string" && phase !== "offline";
  });
}

/**
 * ⭐ The client on air (broadcast-ready § The client on air), mounted once
 * at the app root:
 *
 * - the type grows to 140% while on air — every width class is rem, so
 *   the layout follows the root font size coherently;
 * - while a stream is up, the client reports its foreground (Saxonberg in
 *   front, another tab, another app) through `client-state-write`, and
 *   nothing about what is showing. Debounced: a blur that becomes a
 *   visibility change within the window reports once.
 */
export function useOnAirClient(): void {
  const onAir = useOnAir();
  const up = useStreamUp();

  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = onAir ? "140%" : "";
    root.dataset.onAir = onAir ? "true" : "false";
    return () => {
      root.style.fontSize = "";
      delete root.dataset.onAir;
    };
  }, [onAir]);

  useEffect(() => {
    if (!up) return;
    let last: StreamForeground | null = null;
    let timer: number | undefined;
    const report = (): void => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const now = currentForeground(document);
        if (now === last) return;
        last = now;
        websocketClient.sendClientStateWrite("stream.foreground", now);
      }, 250);
    };
    report();
    document.addEventListener("visibilitychange", report);
    window.addEventListener("focus", report);
    window.addEventListener("blur", report);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", report);
      window.removeEventListener("focus", report);
      window.removeEventListener("blur", report);
    };
  }, [up]);
}
