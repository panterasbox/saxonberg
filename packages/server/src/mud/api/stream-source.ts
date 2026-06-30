/**
 * StreamSourceApi — the operator-configured broadcast sources for the
 * cockpit's livestream-viewer embed.
 *
 * A thin read surface over the `livestream.broadcastSources` AppSetting
 * (a JSON array of {@link StreamSource}, the `renown.decayHalfLives`
 * JSON-in-a-string precedent). `current()` parses + shape-validates the
 * setting and returns a clean `StreamSource[]`, falling back to `[]` on
 * an absent / malformed / wrong-shaped value — the embed must never
 * crash on operator typos.
 *
 * Pure cache-read utility (no protection-needing logic, no connection
 * state), so it lives entirely on the Api as static methods rather than
 * delegating to a logic singleton. Consumed by the welcome snapshot
 * (`Avatar.enter`) and the `stream-sources` live push.
 */

import { AppApi } from "./app";
import { AppSettingKeys } from "../lib/config/AppSettings";
import { SecurityApi } from "./security";
import type { StreamSource } from "@saxonberg/types";

export class StreamSourceApi {
  private constructor() {}

  /**
   * The current operator-configured broadcast sources, parsed and
   * shape-validated. `[]` when nothing is configured or the setting is
   * malformed.
   */
  static current(): StreamSource[] {
    // Pre-warm / test safety: a read before `AppSettings.warm()` throws.
    // The embed must degrade to "no broadcast", never crash a caller
    // (the welcome-payload build runs this on every login).
    let raw: string;
    try {
      raw = AppApi.setting(AppSettingKeys.livestreamBroadcastSources);
    } catch {
      return [];
    }
    if (!raw) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) return [];
    const out: StreamSource[] = [];
    for (const entry of parsed) {
      const shaped = StreamSourceApi.shape(entry);
      if (shaped) out.push(shaped);
    }
    return out;
  }

  /**
   * Narrow one raw array entry to a `StreamSource`, or `null` when it
   * doesn't match either platform shape. Keeps the per-entry validation
   * in one place so a future platform is one branch.
   */
  private static shape(entry: unknown): StreamSource | null {
    if (typeof entry !== "object" || entry === null) return null;
    const e = entry as Record<string, unknown>;
    if (e.platform === "twitch" && typeof e.channel === "string" && e.channel) {
      return { platform: "twitch", channel: e.channel };
    }
    if (e.platform === "youtube" && typeof e.videoId === "string" && e.videoId) {
      return { platform: "youtube", videoId: e.videoId };
    }
    return null;
  }
}

SecurityApi.decorateApiClass(StreamSourceApi);
