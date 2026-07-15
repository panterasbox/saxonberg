/**
 * CombatFog — the epistemic layer: what an observer *perceives* of an
 * opponent's poise, given their own sharpness (value-object).
 *
 * Combat's uncertainty is **poker, not slots** — never a die, always a
 * misread. The fog is the "dice": you don't see the opponent's true state,
 * you see it *fogged by your own skill*. A sharp fighter sees signal; a
 * dull one sees noise — and, crucially, mistakes a **feint** for a real
 * opening and bites.
 *
 * Two distortions, both **deterministic** functions of sharpness (no RNG):
 *
 *   - **Band fog** — below `clearSharpness`, the opponent's band is shifted
 *     one step toward `steady` (they look calmer / more composed than they
 *     are), so a dull fighter under-reads a foe who is actually cracking.
 *   - **The feint trap** — a feinting opponent reads as `open` (a real,
 *     exploitable window) to anyone who does not *read* the feint (sharpness
 *     below `readSharpness`); a reader sees through it (true band + a
 *     `feint` tell). This is the one mechanism that makes the feint work
 *     and the fog is shared with the exchange engine's bite decision, so
 *     "the fog says open" and "I bit the feint" can never contradict.
 *
 * Bands never numbers: the input and output are `PoiseBand`s; the true
 * scalar never leaves `Poise`.
 */

import { POISE_BANDS, type PoiseBand } from "./Poise";

export interface FogConfig {
  /** At/above this sharpness, ordinary band fog clears (you see the true band). */
  clearSharpness: number;
  /** At/above this sharpness, you read a feint (don't bite; see the tell). */
  readSharpness: number;
}

/**
 * Defaults (fractions of the [0,1] sharpness scale): the seeded-literal
 * fallback; the session overrides from `combat.fog.*` AppSettings.
 */
export const DEFAULT_FOG_CONFIG: FogConfig = {
  clearSharpness: 0.7,
  readSharpness: 0.7,
};

/** What an observer perceives — a (possibly distorted) band + an optional tell. */
export interface FogReading {
  band: PoiseBand;
  /** Present only when the observer *read* a feint (the exploitable tell). */
  tell?: "feint";
}

export class CombatFog {
  private constructor() {}

  /**
   * Perceive `trueBand` through the observer's `sharpness`. `feinting` =
   * whether the observed combatant is presenting a feint this beat.
   */
  static perceive(
    trueBand: PoiseBand,
    sharpness: number,
    feinting: boolean,
    config: FogConfig = DEFAULT_FOG_CONFIG,
  ): FogReading {
    const readsFeint = CombatFog.reads(sharpness, config);
    if (feinting && !readsFeint) {
      // Baited: the feint presents as a real, exploitable opening.
      return { band: "open" };
    }
    const seesTell = feinting && readsFeint;
    const band =
      sharpness >= config.clearSharpness
        ? trueBand
        : stepTowardSteady(trueBand);
    return seesTell ? { band, tell: "feint" } : { band };
  }

  /**
   * Whether an observer of this sharpness *reads* a feint (won't bite). The
   * exchange engine's bite decision and the fog's tell share this one gate,
   * so they never contradict.
   */
  static reads(sharpness: number, config: FogConfig = DEFAULT_FOG_CONFIG): boolean {
    return sharpness >= config.readSharpness;
  }
}

/** Shift a band one step toward `steady` (the "looks calmer" distortion). */
function stepTowardSteady(band: PoiseBand): PoiseBand {
  const i = POISE_BANDS.indexOf(band);
  if (i <= 0) return band;
  return POISE_BANDS[i - 1] as PoiseBand;
}
