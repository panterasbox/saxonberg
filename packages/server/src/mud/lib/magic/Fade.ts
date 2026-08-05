/**
 * Fade — how fast a held specification decays, and what that costs.
 *
 * ## Fade is felt as COST, never as failure (requirements D15)
 *
 * A hazy spell costs more mana for the same effect, and eventually is
 * not worth casting. **It never fails outright.** That is what makes
 * memory *felt* — continuously, in a number the player already watches —
 * rather than felt once, at the worst possible moment, as a gotcha.
 *
 * **Competence never fades; specifications do.** The claim decays, the
 * deeds do not. Casting renews the pattern, so an actively used spell
 * never fades: you lose only what you do not use.
 *
 * ## Four axes, each with a real basis
 *
 * **`fadeRate` is a property of (spell × holder × history), never of the
 * book.** That last part is the load-bearing negative — once a
 * specification is in a mind, the book that put it there has no say in
 * how fast it degrades. A well-written one only gets you back to sharp
 * *faster*, which is the teaching product and is legible (D16).
 *
 * 1. **Maturity** — each refresh lengthens the next interval (the
 *    spacing effect). The anti-treadmill mechanism: maintenance cost
 *    falls on *new* additions rather than on the whole repertoire, so a
 *    large mature library is nearly free.
 * 2. **Competence in the relevant Disciplines** — expertise slows
 *    forgetting for *structured material in its own domain* (Chase &
 *    Simon; Gobet & Simon found only a small residual effect on
 *    unstructured material). So competence protects the spells in *its*
 *    cells, not everything the holder knows. Competence therefore pays
 *    twice, which makes **breadth expensive and depth cheap** — and
 *    items are the counterweight that buys breadth without the upkeep.
 * 3. **Specification complexity** — more to hold, faster to lose.
 * 4. **Interference** — similar specifications degrade each other, and
 *    similarity is exactly our case, since spells in neighbouring grid
 *    cells are the most alike things a holder could carry. This is the
 *    **repertoire limiter**: there is no slot count and nothing forbids
 *    reading every book in the library, but the more you hold the hazier
 *    they all get, so you settle at the repertoire you can afford. A
 *    broad generalist is permanently mediocre across their whole list; a
 *    specialist's few are razor-sharp.
 *
 * Pure and clock-free, which is the only honest way to test AC 30 — each
 * axis can be moved alone and the others held still.
 */

/** What the fade calculation needs to know about one held spell. */
export interface FadeInputs {
  /**
   * How many times this specification has been refreshed (studied or
   * cast). Drives the spacing effect.
   */
  readonly maturity: number;
  /**
   * The holder's limiting competence band rank across the spell's two
   * grid axes, 0-based. Expertise protects structured material *in its
   * own domain*.
   */
  readonly competenceRank: number;
  /**
   * How much there is to hold. Derived from the spell's own shape (its
   * effect count and required band), never authored as a difficulty
   * knob.
   */
  readonly complexity: number;
  /**
   * How many OTHER held specifications sit in a neighbouring grid cell
   * — sharing a verb or a noun. The repertoire limiter.
   */
  readonly neighbours: number;
}

/** Tuning constants. *Calibrate at launch* (D21). */
export const FADE_DEFAULTS = {
  /** Sharpness lost per game-day at maturity 0, no competence, complexity 1. */
  BASE_PER_GAME_DAY: 0.04,
  /** Each refresh multiplies the interval by this (the spacing effect). */
  MATURITY_FACTOR: 0.72,
  /** Each competence band above untrained multiplies the rate by this. */
  COMPETENCE_FACTOR: 0.8,
  /** Each neighbouring specification adds this fraction to the rate. */
  INTERFERENCE_PER_NEIGHBOUR: 0.12,
  /**
   * Below this sharpness a specification is a **defective copy** — it
   * still casts, just badly. Never a failure threshold.
   */
  DEFECTIVE_BELOW: 0.25,
  /** Mana multiplier at zero sharpness. A hazy spell costs this much more. */
  MAX_COST_MULTIPLIER: 3,
  /**
   * What a defective copy costs on top, multiplicatively (D14). Read
   * above your comprehension floor and you get a copy you BELIEVE is
   * correct, which costs far more than it should on every cast.
   */
  DEFECTIVE_COST_MULTIPLIER: 2,
} as const;

const GAME_SECONDS_PER_DAY = 24 * 3600;

export class Fade {
  /**
   * **Sharpness lost per game-second**, given the four axes.
   *
   * Deliberately a *rate* rather than a curve: it is integrated
   * reconcile-on-read against elapsed game time, so a holder who was
   * away and a holder who was busy lose the same amount for the same
   * interval. Nothing here reads a clock.
   */
  public static ratePerGameSec(inputs: FadeInputs): number {
    const D = FADE_DEFAULTS;
    const maturity = Math.max(0, inputs.maturity);
    const competence = Math.max(0, inputs.competenceRank);
    const complexity =
      Number.isFinite(inputs.complexity) && inputs.complexity > 0
        ? inputs.complexity
        : 1;
    const neighbours = Math.max(0, inputs.neighbours);

    const perDay =
      D.BASE_PER_GAME_DAY *
      Math.pow(D.MATURITY_FACTOR, maturity) *
      Math.pow(D.COMPETENCE_FACTOR, competence) *
      complexity *
      (1 + D.INTERFERENCE_PER_NEIGHBOUR * neighbours);
    return perDay / GAME_SECONDS_PER_DAY;
  }

  /** Sharpness after `elapsedGameSec`, floored at 0. */
  public static sharpnessAfter(
    sharpness: number,
    elapsedGameSec: number,
    inputs: FadeInputs,
  ): number {
    if (!Number.isFinite(elapsedGameSec) || elapsedGameSec <= 0) {
      return sharpness;
    }
    const lost = Fade.ratePerGameSec(inputs) * elapsedGameSec;
    return Math.max(0, Math.min(1, sharpness - lost));
  }

  /**
   * **The cost multiplier a given sharpness implies.** 1 at fully
   * sharp, rising to {@link FADE_DEFAULTS.MAX_COST_MULTIPLIER} at zero.
   *
   * This is the whole of "fade is felt as cost". It is continuous and it
   * never returns Infinity — there is no sharpness at which the spell
   * stops working, only one at which it stops being worth casting, and
   * the player gets to make that call themselves.
   */
  public static costMultiplier(sharpness: number, defective = false): number {
    const s = Number.isFinite(sharpness)
      ? Math.max(0, Math.min(1, sharpness))
      : 1;
    const base =
      1 + (FADE_DEFAULTS.MAX_COST_MULTIPLIER - 1) * (1 - s);
    return defective
      ? base * FADE_DEFAULTS.DEFECTIVE_COST_MULTIPLIER
      : base;
  }

  /** Is this sharpness low enough to read as a bad copy? */
  public static isHazy(sharpness: number): boolean {
    return sharpness < FADE_DEFAULTS.DEFECTIVE_BELOW;
  }

  /**
   * **How long refreshing takes**, as a fraction of a full study — the
   * savings curve (D16). A nearly-sharp spell refreshes quickly; a badly
   * decayed one takes far longer.
   *
   * That shape is what rewards **regular light maintenance over
   * cramming**, which is the behaviour the spacing effect predicts and
   * the one worth encouraging.
   */
  public static refreshFraction(sharpness: number): number {
    const s = Number.isFinite(sharpness)
      ? Math.max(0, Math.min(1, sharpness))
      : 0;
    // Quadratic rather than linear: the last stretch back to sharp is
    // cheap, the first climb out of hazy is not.
    return (1 - s) * (1 - s);
  }

  /**
   * The complexity of a spell, derived from its own shape rather than
   * authored. More effects and a higher floor band both mean more to
   * hold — and deriving it means no author can quietly make their spell
   * cheap to remember.
   */
  public static complexityOf(effectCount: number, bandRank: number): number {
    return 1 + 0.5 * Math.max(0, effectCount - 1) + 0.25 * Math.max(0, bandRank);
  }
}
