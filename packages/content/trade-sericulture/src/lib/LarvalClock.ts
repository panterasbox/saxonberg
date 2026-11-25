/**
 * LarvalClock — ⭐ the degree-day law a silkworm ages by (organism-biology
 * D10), extracted from `RearingMixin` so the tray and a worm off it run ONE
 * law: an age is a band of degree-days since hatch, the last tenth of ages
 * I–IV a moult. A value, never a Stuff; nothing here reads the clock — the
 * caller holds the degree-days and asks.
 */

/** ⭐ The end of each age, in degree-days since hatch — about 23 days at 25 °C in all. */
export const AGE_END_DD = [52, 97, 157, 232, 352] as const;
/** The last tenth of ages I–IV is a moult: asleep, eating nothing. */
export const MOULT_SHARE = 0.1;

export class LarvalClock {
  constructor(public readonly degreeDays: number) {}

  /** Which age (1–5) the degree-days fall in. */
  public age(): number {
    for (let i = 0; i < AGE_END_DD.length; i++) {
      if (this.degreeDays < AGE_END_DD[i]!) return i + 1;
    }
    return 5;
  }

  /** In the last tenth of ages I–IV: asleep, shedding. */
  public inMoult(): boolean {
    const age = this.age();
    if (age >= 5) return false;
    const start = age === 1 ? 0 : AGE_END_DD[age - 2]!;
    const end = AGE_END_DD[age - 1]!;
    return this.degreeDays >= end - (end - start) * MOULT_SHARE;
  }
}
