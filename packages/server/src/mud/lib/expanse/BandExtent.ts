/**
 * BandExtent — where a band IS: a closed, two-word vocabulary.
 *
 * - **corridor** — two points and a width: the Westerlies between the
 *   mouth and Gannet Rock, a channel over a bar. A rectangle on the local
 *   plane, `from` → `to`, `widthNm` across.
 * - **belt** — a span with no endpoints at all: a latitude of fog, a
 *   longitude of ice. Joins nothing and behaves exactly as a corridor does
 *   (requirements AC 17). `lonMinDeg` / `lonMaxDeg` are optional — a belt
 *   that names neither runs round the world.
 *
 * ⭐ A band confers cost and character, NEVER connectivity: the only
 * question an extent answers is *is this point inside*, plus the exact
 * parametric places a straight track enters and leaves it — which is what
 * makes a boundary crossing deterministic, reportable and orderable.
 *
 * Both shapes are convex, so a straight segment enters at most once and
 * leaves at most once; `crossings` is a Liang–Barsky clip.
 */

import { GeoPosition, type GeoPositionRecord } from './GeoPosition';

export const BAND_EXTENT_KINDS = ['corridor', 'belt'] as const;
export type BandExtentKind = (typeof BAND_EXTENT_KINDS)[number];

export type BandExtentRecord =
  | {
      kind: 'corridor';
      from: GeoPositionRecord;
      to: GeoPositionRecord;
      widthNm: number;
    }
  | {
      kind: 'belt';
      latMinDeg: number;
      latMaxDeg: number;
      lonMinDeg?: number;
      lonMaxDeg?: number;
    };

/** A boundary the straight track meets, at parameter `t ∈ [0, 1]`. */
export interface BandCrossing {
  t: number;
  entering: boolean;
}

const NM_PER_DEGREE = 60;

export class BandExtent {
  readonly record: BandExtentRecord;

  constructor(record: BandExtentRecord) {
    if (!record || !BAND_EXTENT_KINDS.includes(record.kind)) {
      throw new Error(
        `BandExtent: kind must be one of ${BAND_EXTENT_KINDS.join(', ')}; ` +
          `got ${JSON.stringify(record?.kind)}`,
      );
    }
    if (record.kind === 'corridor') {
      if (!(record.widthNm > 0)) {
        throw new Error('BandExtent: a corridor needs a positive widthNm');
      }
      new GeoPosition(record.from);
      new GeoPosition(record.to);
    } else if (!(record.latMaxDeg > record.latMinDeg)) {
      throw new Error('BandExtent: a belt needs latMaxDeg > latMinDeg');
    }
    this.record = record;
  }

  get kind(): BandExtentKind { return this.record.kind; }

  /** Is `pos` inside? The one question a band answers. */
  contains(pos: GeoPosition): boolean {
    const r = this.record;
    if (r.kind === 'belt') {
      if (pos.latDeg < r.latMinDeg || pos.latDeg > r.latMaxDeg) return false;
      if (r.lonMinDeg === undefined || r.lonMaxDeg === undefined) return true;
      return pos.lonDeg >= r.lonMinDeg && pos.lonDeg <= r.lonMaxDeg;
    }
    const { u, v, length } = this.corridorFrame(pos);
    return u >= 0 && u <= length && Math.abs(v) <= r.widthNm / 2;
  }

  /**
   * Square nautical miles — how the narrowest band is chosen where
   * bands overlap (the zone walk's innermost rule: the narrow one wins).
   */
  area(): number {
    const r = this.record;
    if (r.kind === 'corridor') {
      return new GeoPosition(r.from).distanceNm(new GeoPosition(r.to)) * r.widthNm;
    }
    const lonSpan = r.lonMinDeg === undefined || r.lonMaxDeg === undefined
      ? 360
      : r.lonMaxDeg - r.lonMinDeg;
    const midLat = ((r.latMinDeg + r.latMaxDeg) / 2) * (Math.PI / 180);
    return (r.latMaxDeg - r.latMinDeg) * NM_PER_DEGREE *
      lonSpan * NM_PER_DEGREE * Math.max(1e-6, Math.cos(midLat));
  }

  /**
   * Where the straight track `a → b` enters and leaves this extent, as
   * parameters along it, sorted. Empty when it never meets a boundary —
   * including when it lies wholly inside or wholly outside.
   */
  crossings(a: GeoPosition, b: GeoPosition): BandCrossing[] {
    const r = this.record;
    let p0: [number, number];
    let p1: [number, number];
    let lo: [number, number];
    let hi: [number, number];
    if (r.kind === 'belt') {
      const lonOpen = r.lonMinDeg === undefined || r.lonMaxDeg === undefined;
      p0 = [a.latDeg, a.lonDeg];
      p1 = [b.latDeg, a.lonDeg + wrap(b.lonDeg - a.lonDeg)];
      lo = [r.latMinDeg, lonOpen ? -Infinity : r.lonMinDeg!];
      hi = [r.latMaxDeg, lonOpen ? Infinity : r.lonMaxDeg!];
    } else {
      const fa = this.corridorFrame(a);
      const fb = this.corridorFrame(b);
      p0 = [fa.u, fa.v];
      p1 = [fb.u, fb.v];
      lo = [0, -r.widthNm / 2];
      hi = [fa.length, r.widthNm / 2];
    }
    const clip = liangBarsky(p0, p1, lo, hi);
    if (clip === null) return [];
    const out: BandCrossing[] = [];
    if (clip.t0 > 0) out.push({ t: clip.t0, entering: true });
    if (clip.t1 < 1) out.push({ t: clip.t1, entering: false });
    return out;
  }

  toJSON(): BandExtentRecord { return this.record; }

  /** `pos` in the corridor's own frame: `u` along it, `v` across it. */
  private corridorFrame(pos: GeoPosition): { u: number; v: number; length: number } {
    const r = this.record as Extract<BandExtentRecord, { kind: 'corridor' }>;
    const from = new GeoPosition(r.from);
    const axis = from.offsetTo(new GeoPosition(r.to));
    const length = Math.hypot(axis.northNm, axis.eastNm);
    const p = from.offsetTo(pos);
    if (length === 0) return { u: 0, v: Math.hypot(p.northNm, p.eastNm), length };
    const ux = axis.eastNm / length;
    const uy = axis.northNm / length;
    return {
      u: p.eastNm * ux + p.northNm * uy,
      v: -p.eastNm * uy + p.northNm * ux,
      length,
    };
  }
}

function wrap(dLon: number): number {
  return ((((dLon + 180) % 360) + 360) % 360) - 180;
}

/** Clip a segment against an axis-aligned box; `null` when it misses. */
function liangBarsky(
  p0: [number, number],
  p1: [number, number],
  lo: [number, number],
  hi: [number, number],
): { t0: number; t1: number } | null {
  let t0 = 0;
  let t1 = 1;
  for (let axis = 0; axis < 2; axis++) {
    const d = p1[axis]! - p0[axis]!;
    for (const [p, q] of [
      [-d, p0[axis]! - lo[axis]!],
      [d, hi[axis]! - p0[axis]!],
    ] as const) {
      if (p === 0) {
        if (q < 0) return null;
        continue;
      }
      const t = q / p;
      if (p < 0) {
        if (t > t1) return null;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return null;
        if (t < t1) t1 = t;
      }
    }
  }
  return { t0, t1 };
}
