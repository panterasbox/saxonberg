/**
 * RangeBand — the engagement-band ladder and its derivations
 * (value-object, pure/unit-tested; the `WeaponProfile`/`Poise` category).
 *
 * A band is **how engaged are these two with each other**, not how many
 * metres apart they stand. The combat design refused coordinates on
 * purpose: range is a per-*pair* relationship, so bands do not compose —
 * A may be `far` from the archer while B is `close` to the archer and A
 * and B are `close` to each other, and that is the model working, not a
 * geometric impossibility to be reconciled.
 *
 * Four tiers, ascending — one melee pair, one ranged pair:
 *
 * | Band | What it is |
 * |---|---|
 * | `close` | the clinch; a dagger or unarmed owns it |
 * | `reach` | a polearm holds you off |
 * | `near`  | thrown blade, sling, flask, sidearm |
 * | `far`   | bow, crossbow, long gun |
 *
 * **The arena caps the ladder, and the cap is derived from an honest
 * number.** Every `Location` reports a real linear extent (metres), and
 * {@link RangeBand.maxForExtent} reads it: a 3 m cell affords
 * `close`/`reach` — bar fights stay knife fights, by physics — while an
 * authored 20 m outdoor cell affords `far`. Nobody authors an enum, and
 * because outdoor cells are already authored larger, the frontier arms
 * itself.
 *
 * ⚠ **`short` is deliberately NOT a band name.** `ReachClass` in
 * `WeaponProfile` is `short|medium|long` — a banded projection of a
 * weapon's authored *length*, a different concept that must never be
 * indexed with a band's rank. See docs/subsystems/ranged.md.
 *
 * `extreme` stays parked until content proves it (closed-vocabulary
 * discipline).
 *
 * Pure + config-injected with seeded literal fallbacks, so the whole
 * ladder unit-tests without booting settings (the `WeaponProfile`
 * precedent).
 */

/** The engagement bands, **ascending** — index is the band's rank. */
export const RANGE_BANDS = ["close", "reach", "near", "far"] as const;

/**
 * The engagement range on a pair. Physically symmetric (both directed
 * edges carry the same value); stepped by the advance/withdraw gambits.
 */
export type RangeState = (typeof RANGE_BANDS)[number];

/** The metre thresholds the arena cap reads. */
export interface RangeBandConfig {
  /** Room linear extent (m) at/above which `near` is affordable. */
  nearMetres: number;
  /** Room linear extent (m) at/above which `far` is affordable. */
  farMetres: number;
}

export const DEFAULT_RANGE_BAND_CONFIG: RangeBandConfig = {
  nearMetres: 6,
  farMetres: 20,
};

export class RangeBand {
  /** The band's rank — `close` 0 … `far` 3. */
  static rank(band: RangeState): number {
    return RANGE_BANDS.indexOf(band);
  }

  /** The band at `rank`, clamped into the ladder. */
  static at(rank: number): RangeState {
    const i = rank < 0 ? 0 : rank >= RANGE_BANDS.length ? RANGE_BANDS.length - 1 : rank;
    return RANGE_BANDS[i]!;
  }

  /**
   * Is this a melee band? `close` and `reach` only — the two tiers a
   * hand weapon can act across. The reach dance (the `close` gambit's
   * flip, the defend-reset) operates strictly inside this pair; a
   * `near`/`far` pair is not "further out reach", it is out of the
   * melee model entirely.
   */
  static isMelee(band: RangeState): boolean {
    return band === "close" || band === "reach";
  }

  /**
   * Step `n` rungs along the ladder, clamped. Negative closes distance
   * (advance), positive opens it (withdraw). The single primitive both
   * band-change gambits are written against.
   */
  static step(band: RangeState, n: number): RangeState {
    return RangeBand.at(RangeBand.rank(band) + n);
  }

  /**
   * The widest band this arena affords, from its real linear extent.
   * A room with no extent to report falls back to the melee cap — the
   * conservative answer, since an unmeasured room cannot promise the
   * distance a bow needs.
   */
  static maxForExtent(
    metres: number | null,
    config: RangeBandConfig = DEFAULT_RANGE_BAND_CONFIG,
  ): RangeState {
    if (metres == null || !Number.isFinite(metres)) return "reach";
    if (metres >= config.farMetres) return "far";
    if (metres >= config.nearMetres) return "near";
    return "reach";
  }

  /**
   * Is `band` past a carrier's effective `envelope`? The one question
   * every launcher and every spell asks before it commits — a thrown
   * flask's envelope is `near`, a bow's is `far`, and a melee strike's
   * is `reach`.
   */
  static beyond(band: RangeState, envelope: RangeState): boolean {
    return RangeBand.rank(band) > RangeBand.rank(envelope);
  }
}
