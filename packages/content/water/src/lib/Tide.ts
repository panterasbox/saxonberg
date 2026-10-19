/**
 * Tide — ⭐ **the sea's level on the moon's clock** (underwater D4).
 *
 * A semidiurnal tide: two highs and two lows a lunar day, the lunar day
 * being the solar day stretched by the moon's own motion — so each high
 * water comes about fifty minutes later than the day before. High water
 * stands at the moon's transit (plus the coast's lag); springs (the big
 * tides) come at new and full moon, neaps at the quarters.
 *
 * A value object: the caller hands in the moon's phase (from
 * `CelestialApi.moonPhase`) and reads the state at an instant. Nothing
 * instances a tide into the world; the expanse and the catalogue hold
 * one each for the waters that have one.
 */

/** One instant's tide. */
export interface TideState {
  /** Height above mean water, m (negative below). */
  levelM: number;
  /** The full range today, low to high, m (springs bigger, neaps smaller). */
  rangeM: number;
  /** 0 at high water, 0.5 at low, back to 1 — where in the cycle we are. */
  phase: number;
  /** The water is coming in. */
  rising: boolean;
  /** Game-seconds of the next high and low water. */
  nextHighS: number;
  nextLowS: number;
  /** The stream: + flooding, − ebbing, ±1 at mid-tide, 0 at the turn. */
  streamFactor: number;
}

/** A solar day, game-seconds. */
const DAY_S = 86_400;

/** How far springs rise above the mean range (and neaps fall below). */
const SPRING_SWING = 0.3;

export class Tide {
  /**
   * @param rangeM    the mean range, low to high, m
   * @param lagS      how long after the moon's transit high water stands here
   * @param synodicDays the moon's month, days (a lunar day is a day × S/(S−1))
   */
  constructor(
    private readonly rangeM: number,
    private readonly lagS = 0,
    private readonly synodicDays = 30,
  ) {}

  /** The semidiurnal period, game-seconds (~12 h 25 m). */
  public periodS(): number {
    const s = Math.max(2, this.synodicDays);
    return (DAY_S * s) / (s - 1) / 2;
  }

  /** ⭐ The tide at `nowS`, given the moon's phase then (0 new, 0.5 full). */
  public at(nowS: number, moonPhase: number): TideState {
    const t = nowS - this.lagS;
    // Two cycles a lunar day: the sun's hour angle less the moon's.
    const theta = this.wrap(4 * Math.PI * (t / DAY_S - moonPhase));
    const range = this.rangeM * (1 + SPRING_SWING * Math.cos(4 * Math.PI * moonPhase));
    const period = this.periodS();
    const toHigh = ((2 * Math.PI - theta) / (2 * Math.PI)) * period;
    const toLow = (this.wrap(Math.PI - theta) / (2 * Math.PI)) * period;
    return {
      levelM: (range / 2) * Math.cos(theta),
      rangeM: range,
      phase: theta / (2 * Math.PI),
      rising: Math.sin(theta) < 0,
      nextHighS: nowS + (toHigh === period ? 0 : toHigh),
      nextLowS: nowS + toLow,
      streamFactor: -Math.sin(theta),
    };
  }

  private wrap(a: number): number {
    const two = 2 * Math.PI;
    return ((a % two) + two) % two;
  }
}
