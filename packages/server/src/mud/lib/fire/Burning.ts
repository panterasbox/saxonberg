/**
 * Burning — the active-fire state a {@link Combustible} host carries while
 * aflame. An immutable value object (the `Reserve` / `Light` / `Grade`
 * precedent): the *fuel remaining* lives in the host's `'fuel'` `Reserve`;
 * this carries the rest of the fire's identity —
 *
 * - `ignitedAtGameSec` — the game-time the fire started (for age / prose).
 * - `complete` — the air-fuel-ratio verdict: `true` = complete combustion
 *   (enough air → hot, clean flame), `false` = incomplete (starved → cooler,
 *   soot + carbon monoxide). Phase-5 chemistry flips it; Phase-3 fires are
 *   born complete.
 *
 * A `null` Burning on the host means "not on fire". The single writer of the
 * host's Burning field is the gated `FireLogic` (plus the host's own
 * reconcile-on-read) — see docs/subsystems/fire.md.
 */

/** The decomposed persistence form of a {@link Burning} (a flat object). */
export interface BurningStored {
  ignitedAtGameSec: number;
  complete: boolean;
}

export class Burning {
  constructor(
    /** Game-time (seconds) the fire started. */
    public readonly ignitedAtGameSec: number,
    /** Complete combustion (hot/clean) vs incomplete (starved → soot + CO). */
    public readonly complete: boolean,
  ) {}

  /** Decompose to the flat persistence form. */
  public toStored(): BurningStored {
    return {
      ignitedAtGameSec: this.ignitedAtGameSec,
      complete: this.complete,
    };
  }

  /** Reconstruct from the stored flat form. */
  public static fromStored(s: BurningStored): Burning {
    return new Burning(s.ignitedAtGameSec, s.complete === true);
  }

  /** An immutable copy with a new completeness verdict. */
  public withComplete(complete: boolean): Burning {
    return new Burning(this.ignitedAtGameSec, complete);
  }
}
