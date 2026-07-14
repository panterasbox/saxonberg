/**
 * Tempo — emergent cadence: a derived per-combatant rate with fractional
 * accumulation (value-object).
 *
 * Combat has **no attacks-per-round scalar**. Each combatant accrues
 * tempo at a rate *derived* from their body and gear, and acts when the
 * accumulator crosses a whole exchange. Fractional tempo carries across
 * beats, so a faster fighter simply acts more often over the same span —
 * the "faster tempo yields strictly more exchanges and openings" property
 * falls straight out of the carry (combat-slate #15).
 *
 * The rate is a pure product of the three inputs that exist today —
 * **encumbrance × endurance × competence** — times the fourth,
 * **weapon balance**, a neutral-default data hook (`balanceFactor`) that
 * the deferred weapon-playstyle cycle will populate from construction
 * without touching this function. Each factor is normalised to ~1.0 at
 * neutral; the shape lives here as one function so the load-bearing
 * competence→cadence curve is isolated and tunable via `combat.*`
 * AppSettings (all magnitudes injected, no I/O here).
 */

/** Normalised inputs to the rate function. Each ~1.0 at neutral. */
export interface TempoInputs {
  /**
   * Carried-load ratio in [0,∞): 0 = unburdened, 1 = at capacity. Higher
   * is slower.
   */
  encumbrance: number;
  /** Endurance-reserve ratio in [0,1]: lower (gassed) is slower. */
  endurance: number;
  /**
   * Competence factor in ~[0.5,1.5]: novice slow, master fast. The
   * session maps a combat `Discipline` band to this number.
   */
  competence: number;
  /** Per-weapon balance; neutral 1.0 (the deferred data hook). */
  balanceFactor: number;
}

/** Tunable coefficients for the rate shape (`combat.*` AppSettings). */
export interface TempoConfig {
  /** Base exchanges-per-tick at fully-neutral inputs. */
  base: number;
  /** How steeply carried load slows you (0 = load ignored). */
  encumbrancePenalty: number;
  /** Floor on the endurance factor so a gassed fighter still crawls. */
  enduranceFloor: number;
  /** Hard floor + ceiling on the derived rate (bounded beats). */
  minRate: number;
  maxRate: number;
}

export const DEFAULT_TEMPO_CONFIG: TempoConfig = {
  base: 1,
  encumbrancePenalty: 0.5,
  enduranceFloor: 0.4,
  minRate: 0.1,
  maxRate: 3,
};

export class Tempo {
  /** Fractional exchanges carried between beats. */
  private carry = 0;

  constructor(private rate: number) {}

  /**
   * The pure rate function: exchanges-per-tick derived from the four
   * inputs. A product of neutral-~1.0 factors, clamped to
   * `[minRate,maxRate]` so no tick ever schedules unbounded work.
   */
  static rateFor(
    inputs: TempoInputs,
    config: TempoConfig = DEFAULT_TEMPO_CONFIG,
  ): number {
    const enduranceFactor =
      config.enduranceFloor +
      (1 - config.enduranceFloor) * clamp01(inputs.endurance);
    const encumbranceFactor = Math.max(
      0.1,
      1 - config.encumbrancePenalty * Math.max(0, inputs.encumbrance),
    );
    const competenceFactor = Math.max(0.1, inputs.competence);
    const balanceFactor = Math.max(0.1, inputs.balanceFactor);
    const raw =
      config.base *
      enduranceFactor *
      encumbranceFactor *
      competenceFactor *
      balanceFactor;
    return clampRange(raw, config.minRate, config.maxRate);
  }

  /** The combatant's current exchanges-per-tick (bands-free internal). */
  getRate(): number {
    return this.rate;
  }

  /** Re-derive the rate mid-fight (endurance drains, a weapon is lost). */
  setRate(rate: number): void {
    this.rate = rate;
  }

  /**
   * Accumulate one beat's worth of tempo and return how many whole
   * exchanges are now available (0, 1, or more for a very fast fighter).
   * The fractional remainder carries to the next beat.
   */
  advance(ticks = 1): number {
    this.carry += this.rate * Math.max(0, ticks);
    const whole = Math.floor(this.carry);
    this.carry -= whole;
    return whole;
  }

  /** Peek at the carried fraction (tests / introspection). */
  getCarry(): number {
    return this.carry;
  }
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function clampRange(n: number, lo: number, hi: number): number {
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}
