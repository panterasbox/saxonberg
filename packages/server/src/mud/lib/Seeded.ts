/**
 * Seeded — ⭐⭐ **the determinism primitive the procedural world is built
 * on**: an integer mixer, and the 0..1 draw taken from it.
 *
 * > *"a total function under a sparse graph; SEEDED vs DERIVED, seed from
 * > the ADDRESS"* — the field pattern.
 *
 * Every procedural field in the game answers *"what is true at this
 * place"* by hashing the place's address and reading the result. Nothing
 * is rolled and stored; the same address gives the same answer forever,
 * on any machine, after any restart. That property is this file.
 *
 * ⚠⚠ **It was written four times.** `mix2` and `roll01` were
 * character-for-character identical in `WeatherLogic`, trade-farming's
 * `GroundCharacter`, trade-mining's `Deposit` and trade-ranching's
 * `HeadSeed` — each module-private, so none could see the others. Four
 * copies of a hash is not a tidiness problem: **if one drifts, two
 * subsystems disagree about the same address**, and the world stops being
 * reproducible in a way no test asserts, because each suite checks its own
 * copy against itself. Found by `pnpm formulae`, 2026-09-14.
 *
 * ⚠ Deliberately NOT `Math.random`. `docs/uncertainty.md` bans
 * resolutional randomness — *roll to decide what the world IS, never what
 * your action DID* — and a seeded field is how the first half stays
 * legal: the ground under your feet was always going to be clay.
 */

/**
 * The seeded-draw primitives. Statics on a value class rather than free
 * exported functions, which `lib/` does not admit.
 */
export class Seeded {
  /**
   * ⭐ **A 32-bit avalanche mix of two integers** — the murmur3 finalizer
   * over a golden-ratio-seeded fold.
   *
   * `h = fmix32((a ⊕ 0x9e3779b9) ⊗ b)`
   *
   * Avalanche is the property that matters: one bit different in `a` or
   * `b` changes about half the output bits, so adjacent addresses in a
   * field look unrelated rather than banded.
   *
   * @internal the determinism substrate — every caller is a procedural
   * field. An author reaches a field through its own subsystem, never
   * through the mixer.
   */
  public static mix(a: number, b: number): number {
    let h = (a ^ 0x9e3779b9) >>> 0;
    h = Math.imul(h ^ (b >>> 0), 0x85ebca6b) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
    return h >>> 0;
  }

  /**
   * A deterministic draw in `[0, 1)` from two integers.
   *
   * `u = mix(a, b) / 2³²`
   *
   * @internal as {@link mix} — the field's own seed, not author surface.
   */
  public static unit(a: number, b: number): number {
    return Seeded.mix(a >>> 0, b >>> 0) / 0x1_0000_0000;
  }
}
