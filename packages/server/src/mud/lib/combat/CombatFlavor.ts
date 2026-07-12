/**
 * CombatFlavor — the condition-keyed narration fragment lookup.
 *
 * The crucial architectural decision (combat-slate Thesis 17,
 * plan §1.5 [VERIFIED-CORRECTION]): combat flavor is **not** fields on
 * `Material`. `Material` has a closed `persistentFields` list, and — more
 * importantly — one lookup keyed on `{aspect, key, channel, outcome}`
 * serves material **and** species / gear / biome fragments, layered by
 * generality, where a `flavor.*` scalar on `Material` could only ever
 * speak for the struck material.
 *
 * A fragment is *optional texture*: `CombatNarration` builds a complete
 * algorithmic frame first, then weaves in whatever fragments this lookup
 * returns. A miss is the common case and costs nothing — the frame is
 * always legible on its own (graceful default).
 *
 * Build 1 realizes the table as an authored code constant (the demo
 * corpus). The schema is deliberately the content-pack shape so the
 * table can migrate to a boot-warmed content catalogue (a new content
 * kind) without any consumer change — `CombatNarration` only ever calls
 * {@link CombatFlavor.lookup}.
 */

import type { Channel } from "../material/Channel";

/** The generality layer a fragment speaks for. */
export type FlavorAspect = "material" | "species" | "gear" | "biome";

/** Narration-outcome buckets the fragment is keyed on (coarser than the
 * mechanical trauma severity). */
export type FlavorOutcome = "graze" | "bite" | "bite-deep" | "deflected";

export interface FlavorKey {
  aspect: FlavorAspect;
  /** The aspect's identity — a material key, species key, gear key, biome. */
  key: string;
  channel: Channel;
  outcome: FlavorOutcome;
}

interface FlavorRow extends FlavorKey {
  /** A short MML-safe clause woven into the narration frame. */
  fragment: string;
}

/**
 * The authored demo corpus. Keyed loosely so a caller can supply a
 * material key like `steel` (the durable `Material` key, not a
 * templatePath) and get an edge/bite-deep clause. Small on purpose;
 * the frame carries the beat without any of these.
 */
const FLAVOR_ROWS: readonly FlavorRow[] = [
  {
    aspect: "material",
    key: "steel",
    channel: "edge",
    outcome: "bite-deep",
    fragment: "the keen steel opens a long bright line",
  },
  {
    aspect: "material",
    key: "steel",
    channel: "edge",
    outcome: "bite",
    fragment: "the edge bites and blood follows",
  },
  {
    aspect: "material",
    key: "steel",
    channel: "point",
    outcome: "bite-deep",
    fragment: "the point punches deep and sucks free",
  },
  {
    aspect: "material",
    key: "iron",
    channel: "blunt",
    outcome: "bite-deep",
    fragment: "the iron lands with a sickening crack",
  },
  {
    aspect: "species",
    key: "wolf",
    channel: "point",
    outcome: "bite",
    fragment: "fangs find purchase",
  },
  {
    aspect: "species",
    key: "wolf",
    channel: "point",
    outcome: "bite-deep",
    fragment: "the jaws close and worry the wound",
  },
];

export class CombatFlavor {
  private constructor() {}

  /**
   * Look up a fragment for a fully-specified key. Returns undefined on a
   * miss (the common, graceful-default case) — the caller narrates the
   * frame without texture.
   */
  static lookup(k: FlavorKey): string | undefined {
    const row = FLAVOR_ROWS.find(
      (r) =>
        r.aspect === k.aspect &&
        r.key === k.key &&
        r.channel === k.channel &&
        r.outcome === k.outcome,
    );
    return row?.fragment;
  }
}
