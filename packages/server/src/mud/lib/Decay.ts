/**
 * Decay — ⭐⭐ **exponential relaxation, in the three forms the game
 * actually uses.**
 *
 * One family, written six times across three tiers before this file:
 * `decayWeight` character-for-character identical in `ConsumerLogic`,
 * `ProducerLogic` and `RenownLogic`; `decayFactor` in `TraitPosition`
 * computing the same thing **in base 2**; and Newton's cooling as a bare
 * expression inside a method in both `Thermal` and `ThermalRegulation`,
 * where no index could see it at all.
 *
 * ⚠ That mattered more than the repetition: *what decay means* for a
 * standing is a design decision, and it had three implementations to
 * change. Found by `pnpm formulae`, 2026-09-14.
 *
 * ⚠⚠ **Not every exponential belongs here.** `Charge.decayFor` and
 * `Freshness.killOver` are the same shape and stay where they are,
 * because their rate is a *subsystem's* quantity (a τ charge decay, an
 * Arrhenius kill rate) rather than a free parameter. What lives here is
 * the relaxation itself, with the rate handed in.
 */

/** The exponential-relaxation forms. Statics on a value class; `lib/` admits no free functions. */
export class Decay {
  /**
   * ⭐ **A half-life weight**: what one unit of something aged `ageS` is
   * still worth when it halves every `halfLifeS`.
   *
   * `w = ½^(age / halfLife)`
   *
   * Returns 1 — full weight, no decay — for a non-positive or
   * non-finite half-life, and for an age at or before zero. That is the
   * honest reading of "this does not decay", and it is what all three
   * standing subsystems already did.
   *
   * @internal the standings and the trait ledger read it; a player reads
   * the standing, never the weight.
   */
  public static byHalfLife(ageS: number, halfLifeS: number): number {
    if (!Number.isFinite(halfLifeS) || halfLifeS <= 0 || ageS <= 0) return 1;
    return Math.pow(0.5, ageS / halfLifeS);
  }

  /**
   * ⭐ **Newton relaxation** — where a value sits after drifting toward a
   * target for `elapsed`, with time constant `tau`.
   *
   * `x(t) = target + (x₀ − target)·e^(−t/τ)`
   *
   * Closed-form and therefore exact for a constant target, which is why
   * passive drift needs no sub-stepping. A non-positive `tau` means no
   * thermal mass at all: the value is the target immediately.
   *
   * @internal thermal drift and body-core regulation call it.
   */
  public static toward(
    from: number,
    target: number,
    elapsed: number,
    tau: number,
  ): number {
    if (!(tau > 0)) return target;
    return target + (from - target) * Math.exp(-elapsed / tau);
  }
}
