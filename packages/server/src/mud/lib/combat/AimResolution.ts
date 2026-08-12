/**
 * AimResolution — a shot resolves from two public commitments, and no
 * dice (value-object, pure/unit-tested; the `RangeBand` category).
 *
 * Bullets don't consult probability; **placement does the deciding**. The
 * shooter commits to a public aim state, the target spends its reactive
 * window on an answer, and the pair indexes a base matrix yielding a
 * placement class. Modifiers then move steps along that ladder. Every
 * input is visible to both sides before either commits, which is what
 * makes this poker rather than slots.
 *
 * **The aim ladder** is public state — the crossbow is visibly spanned,
 * the aim visibly held:
 *
 *  - `snap` — this beat, cheap, imprecise
 *  - `held` — one beat, visible
 *  - `settled` — two beats, visible, the target is telegraphed
 *
 * **The answers** are what the reactive window buys: `stand` (call the
 * bluff) · `move` (band change under fire) · `cover` · `drop` ·
 * `counter` (return fire — standoffs become timing games).
 *
 * ## Two Wave 1 caveats, both deliberate
 *
 * **The whole table ships; only part of it is reachable yet.** A thrown
 * flask can only ever commit `snap` (for `muscle`, aim IS the throw), and
 * two answers need machinery that defers — `cover` needs authored cover,
 * `counter` needs the reactive window. Shipping only the reachable row
 * would leave the matrix *shape* unproven until the wave that depends on
 * it, which is precisely the shape most likely to be wrong. So the whole
 * table is authored and unit-tested here, where it costs nothing, and the
 * engine wires the reachable subset.
 *
 * **`cover` resolves as `stand` until cover exists.** Pinned by a test
 * that will fail loudly the moment authored cover lands, which is the
 * point — a silent placeholder would survive into a wave that thinks
 * cover works.
 *
 * ## The rail
 *
 * **Risk must never come from dice.** There is no `Math.random` on any
 * path through this module, and a test asserts it. If a shot goes badly
 * it is because of a commitment somebody made and everybody could see.
 */

import { RangeBand, type RangeState } from "./RangeBand";

/** The shooter's public aim commitment, ascending in patience. */
export const AIM_LADDER = ["snap", "held", "settled"] as const;

/** One of {@link AIM_LADDER}. */
export type AimState = (typeof AIM_LADDER)[number];

/** What the target spends its reactive window on. */
export const RANGE_ANSWERS = [
  "stand",
  "move",
  "cover",
  "drop",
  "counter",
] as const;

/** One of {@link RANGE_ANSWERS}. */
export type RangeAnswer = (typeof RANGE_ANSWERS)[number];

/** Where the shot lands, ascending in severity. */
export const PLACEMENTS = ["miss", "graze", "hit", "precise"] as const;

/** One of {@link PLACEMENTS}. */
export type Placement = (typeof PLACEMENTS)[number];

/** The modifiers that step a placement along the ladder. */
export interface AimModifiers {
  /** Flight quality is poor — an unbalanced thrown object, a bad spine match. */
  poorStability?: boolean;
  /** The band is past the carrier's effective envelope. */
  beyondEffective?: boolean;
  /** Cover quality at the target: 0 none, 1 partial, 2 substantial. */
  coverQuality?: 0 | 1 | 2;
  /** The target moved this beat (the shipped motion-degrade rules). */
  targetMoving?: boolean;
}

export interface AimResolutionConfig {
  /** Base matrix, one row per aim state, ordered by {@link RANGE_ANSWERS}. */
  matrix: Record<AimState, readonly Placement[]>;
  poorStabilityStep: number;
  beyondEffectiveStep: number;
  coverStepPerQuality: number;
  targetMovingStep: number;
}

/**
 * The seeded table. Read it as: patience buys placement, and every answer
 * trades something for something.
 *
 * `stand` calls the bluff and eats a settled shot; `drop` is the best
 * answer to a settled shot and the worst to a snap one (you are on the
 * floor when the next comes); `counter` trades your safety for shooting
 * back.
 */
export const DEFAULT_AIM_RESOLUTION_CONFIG: AimResolutionConfig = {
  matrix: {
    //         stand     move      cover     drop      counter
    snap: ["hit", "graze", "graze", "miss", "graze"],
    held: ["hit", "hit", "graze", "graze", "hit"],
    settled: ["precise", "hit", "hit", "graze", "hit"],
  },
  poorStabilityStep: -1,
  beyondEffectiveStep: -1,
  coverStepPerQuality: -1,
  targetMovingStep: -1,
};

export class AimResolution {
  /** The placement's rank — `miss` 0 … `precise` 3. */
  static rank(p: Placement): number {
    return PLACEMENTS.indexOf(p);
  }

  /** The placement at `rank`, clamped into the ladder. */
  static at(rank: number): Placement {
    const i =
      rank < 0 ? 0 : rank >= PLACEMENTS.length ? PLACEMENTS.length - 1 : rank;
    return PLACEMENTS[i]!;
  }

  /** Step `n` rungs along the placement ladder, clamped. */
  static step(p: Placement, n: number): Placement {
    return AimResolution.at(AimResolution.rank(p) + n);
  }

  /**
   * Resolve a shot.
   *
   * `answer` is `null` when the target has none to give — restrained,
   * unconscious, or otherwise unable to spend a reactive window. That is
   * the coup-de-grâce case and it resolves at `precise`: honest, grim,
   * and the reason the incapacitation rung on the consent ladder is
   * load-bearing rather than decorative.
   */
  static resolve(
    aim: AimState,
    answer: RangeAnswer | null,
    modifiers: AimModifiers = {},
    config: AimResolutionConfig = DEFAULT_AIM_RESOLUTION_CONFIG,
  ): Placement {
    if (answer === null) return "precise";

    // `cover` reads as `stand` until authored cover exists (Wave 2).
    const effective: RangeAnswer = answer === "cover" ? "stand" : answer;
    const row = config.matrix[aim];
    const base = row[RANGE_ANSWERS.indexOf(effective)] ?? "miss";

    let steps = 0;
    if (modifiers.poorStability) steps += config.poorStabilityStep;
    if (modifiers.beyondEffective) steps += config.beyondEffectiveStep;
    if (modifiers.targetMoving) steps += config.targetMovingStep;
    if (modifiers.coverQuality) {
      steps += config.coverStepPerQuality * modifiers.coverQuality;
    }
    return AimResolution.step(base, steps);
  }

  /**
   * Is `aim` reachable for a launcher whose aim collapses into readiness?
   *
   * A muscle-held launcher cannot sit at the top of the ladder — drawing
   * IS aiming, and the draw burns you down. `settled` is not forbidden to
   * a bow, which would be cleaner and wrong; it is *self-defeating* past
   * the archer's hold window, expressed as `poorStability` at the call
   * site. This predicate exists so that decision has one home.
   */
  static decaysWhileHeld(aimIsReadiness: boolean, aim: AimState): boolean {
    return aimIsReadiness && aim === "settled";
  }

  /**
   * The band modifier for a carrier: is this shot past its envelope?
   * Folded here so callers pass one `AimModifiers` rather than
   * re-deriving the comparison.
   */
  static beyondEnvelope(band: RangeState, envelope: RangeState): boolean {
    return RangeBand.beyond(band, envelope);
  }
}
