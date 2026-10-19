/**
 * WashPolicy — ⭐ **how a hand washes, by its band** (cleanliness D26): the
 * value object a paid wash is done by. The laundress does not choose her
 * outcome; her textiles band chooses her METHOD, and the chemistry on the
 * garment (`Soilable.washSite`) decides what that method does to it.
 *
 * | band | does |
 * |---|---|
 * | untrained | boils everything, and reaches for lye when there is any |
 * | novice | boils everything in the copper, with soap — the old way |
 * | competent | reads the fibre: wool lukewarm, blood cold, linen hot |
 * | proficient · expert | as competent, and never hot enough to shrink |
 *
 * So a novice boiling a wool jumper felts it — not because she rolled
 * badly, but because boiling is what she does — and the house pays for it.
 */

import type { CompetenceBandName } from '../advancement/CompetenceBand';

/** What a hand does to one garment: the water's heat, the effort, the agent. */
export interface WashMethod {
  /** The water she heats it to, K. */
  waterK: number;
  /** `1` a plain wash, up to `3` a scrub. */
  effort: number;
  /** Which of the house's cleansers she reaches for: `lye` before soap, or soap. */
  reachesFor: 'lye' | 'soap';
}

/** What a hand can see of the garment before it goes in the water. */
export interface WashSubject {
  /** A protein fibre (wool) — what boiling felts. */
  wool: boolean;
  /** Blood on it — what hot water sets. */
  blood: boolean;
}

const BOIL_K = 373;
const HOT_K = 345;
const LUKEWARM_K = 303;
const COLD_K = 290;

export class WashPolicy {
  constructor(private readonly band: CompetenceBandName) {}

  /** The method this band uses on `subject`. */
  public methodFor(subject: WashSubject): WashMethod {
    switch (this.band) {
      case 'untrained':
        return { waterK: BOIL_K, effort: 3, reachesFor: 'lye' };
      case 'novice':
        return { waterK: BOIL_K, effort: 2, reachesFor: 'soap' };
      case 'competent':
        return {
          waterK: subject.blood ? COLD_K : subject.wool ? LUKEWARM_K : HOT_K,
          effort: 2,
          reachesFor: 'soap',
        };
      default:
        // ⭐ A master never ruins: nothing reaches the shrink line.
        return {
          waterK: subject.blood ? COLD_K : subject.wool ? LUKEWARM_K : 325,
          effort: 2,
          reachesFor: 'soap',
        };
    }
  }

  /** Whether this hand tells the customer what it sees (fibre, stains). */
  public readsTheCloth(): boolean {
    return this.band !== 'untrained';
  }

  /** What she says she will do, in her words — never the consequence. */
  public sayMethod(subject: WashSubject): string {
    const m = this.methodFor(subject);
    if (m.waterK >= BOIL_K) return "I'll boil it";
    if (m.waterK >= 333) return "I'll wash it hot";
    if (m.waterK <= COLD_K) return "I'll get the blood out in cold water first";
    return "I'll wash it lukewarm, gently";
  }
}
