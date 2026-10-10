/**
 * Plot — where a navigator THINKS the craft is: the dead reckoning.
 *
 * ⭐⭐ Two positions, and only one is ever shown. The TRUE position is the
 * craft's (derived from the fix, the course and every band's set — see
 * `Voyaging`); the RECKONED position is this: the last fix, carried
 * forward along the courses steered at the speed logged, knowing nothing
 * of the set. The two diverge exactly as far as the water moved you, and
 * `locate` reports this one, labelled as a reckoning, never the other.
 *
 * Its uncertainty grows while under way (`expanse.reckoningGrowthNmPerHour`)
 * and a fix collapses it: a sight of a landmark, a sounding, a sun sight
 * (which mends latitude only), a pilot's word, arriving somewhere.
 *
 * ⭐ Competence buys INFORMATION, not outcomes: how precisely the
 * reckoning is STATED is the reader's band; the reckoning itself is the
 * same for everybody aboard.
 */

import { GeoPosition, type GeoPositionRecord } from './GeoPosition';

export interface PlotRecord {
  fix: GeoPositionRecord;
  atS: number;
  /** Uncertainty at the fix, nautical miles. */
  nm: number;
}

/** A bracket in words, by competence band — never a refusal. */
const BRACKET_WORDS: Record<string, (nm: number) => string> = {
  untrained: (nm) => (nm < 2 ? 'close to here, you think' : 'somewhere hereabouts — a guess'),
  novice: (nm) => `within ${Math.max(1, Math.round(nm / 5) * 5)} miles or so`,
  competent: (nm) => `within about ${Math.max(1, Math.round(nm))} miles`,
  proficient: (nm) => `within ${nm.toFixed(1)} miles`,
  expert: (nm) => `within ${nm.toFixed(1)} miles, and you know which way the error runs`,
};

export class Plot {
  readonly fix: GeoPosition;
  readonly atS: number;
  readonly nm: number;

  constructor(record: PlotRecord) {
    this.fix = new GeoPosition(record.fix);
    this.atS = record.atS;
    this.nm = Math.max(0, record.nm);
  }

  /** The reckoning at `nowS`, steering `bearingDeg` at `speedKn` since the fix. */
  reckonedAt(nowS: number, bearingDeg: number | null, speedKn: number): GeoPosition {
    if (bearingDeg === null || nowS <= this.atS) return this.fix;
    return this.fix.destination(bearingDeg, (speedKn * (nowS - this.atS)) / 3600);
  }

  /** How uncertain the reckoning is at `nowS`, nautical miles. */
  uncertaintyAt(nowS: number, underWay: boolean, growthNmPerHour: number): number {
    if (!underWay || nowS <= this.atS) return this.nm;
    return this.nm + (growthNmPerHour * (nowS - this.atS)) / 3600;
  }

  /** An uncertainty of `nm` in words, for a reader at `band`. */
  statedBracket(nm: number, band: string): string {
    return (BRACKET_WORDS[band] ?? BRACKET_WORDS.untrained!)(nm);
  }

  toJSON(): PlotRecord {
    return { fix: this.fix.toJSON(), atS: this.atS, nm: this.nm };
  }
}
