/**
 * The emote catalogue's fetch — lazy, once per session, cached by the
 * browser across sessions.
 *
 * ⭐⭐ **It used to ride `ConnectionEstablishedPayload`.** That is the
 * wrong home for something expected to grow: `Avatar.enter()` runs on
 * RECONNECT as well as fresh login, so a flaky connection re-shipped the
 * whole catalogue every drop — onto a packet already carrying the topic
 * catalogue, the news window and the frame backfill.
 *
 * It is authored, global, and changes only when somebody runs
 * `soul make`, so it is HTTP-cacheable. `GET /api/emotes` carries a
 * strong ETag; the browser revalidates and gets a `304` with no body.
 *
 * ⭐ And it is fetched on the **first reaction affordance opened**, not
 * at boot: a player who never reacts never pays for it at all.
 *
 * | | bytes |
 * |---|---|
 * | reconnect | 0 |
 * | later session, unchanged catalogue | 0 (`304`) |
 * | never reacts | 0 |
 *
 * ⚠ In-flight requests are shared. Opening two pickers quickly must not
 * become two fetches, and the guard is the promise rather than a
 * boolean — a boolean set before the await still lets the second caller
 * through on the same tick.
 */

import type { EmoteCatalogueEntry } from "@saxonberg/types";
import { SERVER_URL } from "../config";
import { useStore } from "./index";

/** The one in-flight fetch, shared by every caller while it runs. */
let inFlight: Promise<void> | null = null;

/**
 * Ensure the catalogue is loaded. Safe to call on every picker open —
 * it returns immediately once the catalogue is in the store, and shares
 * the request when one is already running.
 */
export async function ensureEmoteCatalogue(): Promise<void> {
  const store = useStore.getState();
  if (store.emoteCatalogue.size > 0) return;
  if (store.emoteCatalogueState === "loading") return inFlight ?? undefined;
  if (inFlight) return inFlight;

  useStore.setState({ emoteCatalogueState: "loading" });

  inFlight = (async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/emotes`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { emotes: EmoteCatalogueEntry[] };
      const map = new Map<string, EmoteCatalogueEntry>();
      for (const e of body.emotes ?? []) map.set(e.verb, e);
      useStore.setState({
        emoteCatalogue: map,
        emoteCatalogueState: "loaded",
      });
    } catch {
      /*
       * ⚠ `failed`, not an empty catalogue. An empty catalogue is a real
       * answer — a world with nothing authored — and the picker renders
       * it as "nothing to pick". A failure that looked the same would be
       * an unwired state wearing an empty state's clothes.
       */
      useStore.setState({ emoteCatalogueState: "failed" });
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Drop the cached catalogue so the next open refetches (author reload). */
export function invalidateEmoteCatalogue(): void {
  inFlight = null;
  useStore.setState({
    emoteCatalogue: new Map(),
    emoteCatalogueState: "idle",
  });
}
