/**
 * MaturationClock — the HOST-AGNOSTIC half of a durative transform: how
 * fast a thing changes at a temperature, how much a hot stretch hurts it,
 * and what grade the worst of it earns (assembly D2).
 *
 * Lifted out of `MaturingMixin`, byte for byte, because a second host
 * wanted the clock and not the vessel. `MaturingMixin` refuses any host
 * without an interior bulk slot — the batch IS the slot — and a board
 * drying in a yard has no slot and no batch; it has a material that loses
 * water at a rate the air decides. The curves are the same curves: a stall
 * below a temperature, a full rate from a happy temperature up, a damage
 * ramp above a line. So they live here, over any {@link ClockProfile}, and
 * the two hosts each keep what is theirs (the batch; the seasoned
 * fraction).
 *
 * Pure: no Stuff, no state, no reads of the world. A `MaturationProfile`
 * row satisfies `ClockProfile` structurally; seasoning supplies a kernel
 * constant.
 */

import type { GradeBand } from '../craft/Grade';

/** Game seconds in a game day. */
export const SECONDS_PER_GAME_DAY = 86_400;

/** Midpoint samples per trajectory stretch when integrating over a gap. */
export const MATURING_SUB_STEPS = 8;

/**
 * Kelvin past `damageAboveK` at which the stretch satisfaction reaches
 * 0 — the width of the damage ramp (inside it, damage is partial).
 */
export const DAMAGE_RAMP_K = 15;

/** The temperature curve a clock runs on — what a profile row declares. */
export interface ClockProfile {
  /** Below this, nothing happens. */
  getStallBelowK(): number;
  /** From here up, the full rate. */
  getHappyK(): number;
  /** Above this, damage. */
  getDamageAboveK(): number;
  /** Fraction per day at the full rate. */
  getRatePerDay(): number;
  /** Above this, nothing happens either (a culture cooked still); `null` none. */
  getStallAboveK(): number | null;
}

/** One stretch of a temperature trajectory. */
export interface TemperatureSample {
  value: number;
  durationS: number;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * The curves, as statics over a profile.
 *
 * @internal read by the maturation hosts in this folder alone — not author
 * surface (the `lint:lib-statics` rule for a lib value-object's statics).
 */
export class MaturationClock {
  /** Conversion rate (fraction/day) at `tempK` under `profile`. */
  static rateAt(profile: ClockProfile, tempK: number): number {
    const above = profile.getStallAboveK();
    if (above !== null && tempK > above) return 0;
    const stall = profile.getStallBelowK();
    const happy = profile.getHappyK();
    if (tempK <= stall) return 0;
    const full = profile.getRatePerDay();
    if (tempK >= happy || happy <= stall) return full;
    return (full * (tempK - stall)) / (happy - stall);
  }

  /** Damage satisfaction at `tempK`: 1 at/below the damage line. */
  static damageSat(profile: ClockProfile, tempK: number): number {
    const damage = profile.getDamageAboveK();
    if (tempK <= damage) return 1;
    return clamp01(1 - (tempK - damage) / DAMAGE_RAMP_K);
  }

  /**
   * Worst-stretch satisfaction → grade band. The husbandry harvest
   * thresholds, second consumer: a batch never run hot grades
   * `masterful`; the deeper into the damage ramp the worst stretch went,
   * the lower the band.
   */
  static bandFor(worst: number): GradeBand {
    if (worst >= 0.95) return 'masterful';
    if (worst >= 0.8) return 'exceptional';
    if (worst >= 0.6) return 'fine';
    if (worst >= 0.35) return 'fair';
    return 'poor';
  }

  /**
   * ⭐ The conversion integral over a trajectory: Σ rateAt(T(s))·dt, in
   * game-days of full-rate work. `rateAt` is clamped (0 below stall, full
   * above happy), so the time-weighted MEAN would misread a stretch that
   * swung across those edges — fold it, per sample.
   */
  static convertedOver(
    profile: ClockProfile,
    samples: readonly TemperatureSample[],
  ): number {
    return samples.reduce(
      (a, s) =>
        a + MaturationClock.rateAt(profile, s.value) * (s.durationS / SECONDS_PER_GAME_DAY),
      0,
    );
  }

  /**
   * The minimum damage satisfaction over a trajectory, folded into a
   * prior worst — a brief hot spike damages even if it cooled back down.
   */
  static worstOver(
    profile: ClockProfile,
    samples: readonly TemperatureSample[],
    prior: number,
  ): number {
    let worst = prior;
    for (const s of samples) {
      const sat = MaturationClock.damageSat(profile, s.value);
      if (sat < worst) worst = sat;
    }
    return worst;
  }
}
