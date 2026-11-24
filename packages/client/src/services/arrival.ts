/**
 * arrival — where the visitor came from (stream arrival D7, D2).
 *
 * ⭐ Decided ONCE per tab, on a load that is not a sign-in's return, and kept
 * in `sessionStorage` so it survives the provider's round trip (which drops
 * the query): the **door** (the word a tagged link names), the **carrier**
 * whose video plays, and the program a link **asked** for.
 *
 * | the load                                             | door     | carrier        |
 * |------------------------------------------------------|----------|----------------|
 * | `?from=twitch` · `youtube` · `kick`                  | that     | that           |
 * | `?from=stream`, the referrer names a carrier         | `stream` | the referrer's |
 * | `?from=stream`, no such referrer                     | `stream` | Twitch         |
 * | no `from`; the referrer is twitch.tv / youtube.com / youtu.be / kick.com | that carrier's word | that |
 * | anything else                                        | none     | none           |
 *
 * `?watch=<name>` is kept only when it is a program's short name by
 * pattern, and only as a QUESTION to `/api/front`: the name used afterward
 * is the one the answer gives. Nothing a link supplies is ever a channel.
 *
 * The remembered sign-in method (`via=` on a successful return) only ORDERS
 * the buttons; the carrier both starts the video and orders them.
 */

import type { ArrivalDoor, ProgramCarrier } from "@saxonberg/types";

/** What the tab knows of how the visitor arrived. */
export interface Arrival {
  door: ArrivalDoor | null;
  carrier: ProgramCarrier | null;
  /** The program a link asked for — a question, never an answer. */
  watch: string | null;
}

/** A sign-in provider's key. */
export type Provider = "google" | "twitch" | "kick";

const ARRIVAL_KEY = "saxonberg.arrival";
const PROVIDER_KEY = "saxonberg.lastProvider";
const NAME_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])$/;
const CARRIERS: readonly ProgramCarrier[] = ["twitch", "youtube", "kick"];
const NONE: Arrival = { door: null, carrier: null, watch: null };

/** The carrier a referrer's host names, or null. */
function carrierOfReferrer(referrer: string): ProgramCarrier | null {
  let host = "";
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
  const is = (domain: string): boolean => host === domain || host.endsWith(`.${domain}`);
  if (is("twitch.tv")) return "twitch";
  if (is("youtube.com") || is("youtu.be")) return "youtube";
  if (is("kick.com")) return "kick";
  return null;
}

/**
 * Read the door from one load (pure — D7's table). `search` is the page's
 * query, `referrer` the document's. A load carrying `auth=` is a sign-in's
 * RETURN and never decides (a Twitch OAuth return would read as *came from
 * Twitch*).
 */
export function readArrival(search: string, referrer: string): Arrival | null {
  const q = new URLSearchParams(search);
  if (q.has("auth")) return null;
  const from = (q.get("from") ?? "").toLowerCase();
  const watchRaw = (q.get("watch") ?? "").trim().toLowerCase();
  const watch = NAME_RE.test(watchRaw) ? watchRaw : null;
  const ref = carrierOfReferrer(referrer);
  if ((CARRIERS as readonly string[]).includes(from)) {
    return { door: from as ArrivalDoor, carrier: from as ProgramCarrier, watch };
  }
  if (from === "stream") return { door: "stream", carrier: ref ?? "twitch", watch };
  if (from === "" && ref) return { door: ref, carrier: ref, watch };
  return null;
}

/**
 * The tab's arrival — decided on the first load that can decide it, and
 * never re-made. Storage blocked (a private window) → no origin.
 */
export function arrival(): Arrival {
  try {
    const kept = window.sessionStorage.getItem(ARRIVAL_KEY);
    if (kept) return JSON.parse(kept) as Arrival;
    const read = readArrival(window.location.search, document.referrer);
    if (read === null) {
      // A sign-in return decides nothing; any other load decides "none".
      if (!new URLSearchParams(window.location.search).has("auth")) {
        window.sessionStorage.setItem(ARRIVAL_KEY, JSON.stringify(NONE));
      }
      return NONE;
    }
    window.sessionStorage.setItem(ARRIVAL_KEY, JSON.stringify(read));
    return read;
  } catch {
    return NONE;
  }
}

/** Remember the method a sign-in SUCCEEDED with (`via=`) — never on a click. */
export function rememberProvider(via: string | null): void {
  if (via !== "google" && via !== "twitch" && via !== "kick") return;
  try {
    window.localStorage.setItem(PROVIDER_KEY, via);
  } catch {
    // Storage blocked: nothing to remember with.
  }
}

/** The remembered sign-in method, or null. */
export function lastProvider(): Provider | null {
  try {
    const v = window.localStorage.getItem(PROVIDER_KEY);
    return v === "google" || v === "twitch" || v === "kick" ? v : null;
  } catch {
    return null;
  }
}

/** The provider a carrier signs in with (YouTube → Google). */
export function providerOfCarrier(carrier: ProgramCarrier | null): Provider | null {
  if (carrier === "youtube") return "google";
  return carrier;
}

/**
 * The sign-in buttons' order (D7): the carrier's provider first, else the
 * remembered one, else Google · Twitch · Kick.
 */
export function providerOrder(
  carrier: ProgramCarrier | null,
  remembered: Provider | null,
): Provider[] {
  const base: Provider[] = ["google", "twitch", "kick"];
  const first = providerOfCarrier(carrier) ?? remembered;
  return first ? [first, ...base.filter((p) => p !== first)] : base;
}

/** The game socket's URL with the tab's door on it (`from=`). */
export function withDoor(url: string, a: Arrival = arrival()): string {
  if (!a.door) return url;
  return `${url}${url.includes("?") ? "&" : "?"}from=${a.door}`;
}
