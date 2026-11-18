/**
 * Vantage — an eye on the chart: a point ({@link GeoPosition}) and the
 * height above the sea it looks from.
 *
 * ⭐ The sight core, shared by every frame (geography build, D3). The
 * sea's horizon and the land's skyline are the same arithmetic: how far
 * two heights see each other over a curved world, and the bearing and
 * range between two points. It was the sea's alone (`Expanse.sightRangeNm`
 * and the candidate loop of `sightingsAmong`); lifting it here means the
 * headland and the deck cannot disagree about the same light.
 *
 * The reach is the navigator's rule, `1.17 (√h_obs + √h_tgt)` nautical
 * miles with heights in feet (the √(2Rh) horizon with refraction folded
 * in), scaled by `√(R / R_earth)` so a smaller world has a nearer horizon
 * (sugar D12). Nothing here is drawn or stored; a vantage is a value.
 *
 * Immutable.
 */
import { BiomeApi } from '../../api/biome';
import type { GeoPosition } from '../expanse/GeoPosition';

/** Feet in a metre — the horizon formula is stated in feet. */
const FT_PER_M = 3.28084;
/** Earth's mean radius, metres — the formula's reference world. */
const EARTH_RADIUS_M = 6_371_000;

/** What an eye makes of one target point: where it lies, and how far it could be seen. */
export interface Sightline {
  /** True bearing from the eye, degrees clockwise from north, `[0, 360)`. */
  bearingDeg: number;
  /** Plane-sailing distance, nautical miles (unrounded). */
  rangeNm: number;
  /** The furthest this target could be seen from this eye in clear air, nautical miles. */
  clearNm: number;
}

export class Vantage {
  readonly at: GeoPosition;
  /** The eye's height above the sea, metres. */
  readonly eyeM: number;

  constructor(at: GeoPosition, eyeM: number) {
    if (!Number.isFinite(eyeM)) throw new RangeError(`Vantage: non-finite eye height ${eyeM}`);
    this.at = at;
    this.eyeM = eyeM;
  }

  /**
   * How far this eye sees a target whose top stands `targetM` above the
   * sea, in clear air, nautical miles — curvature binds, so a height sees
   * further and a tall thing is seen from further.
   */
  reachNm(targetM: number): number {
    const a = Math.sqrt(Math.max(0, this.eyeM) * FT_PER_M);
    const b = Math.sqrt(Math.max(0, targetM) * FT_PER_M);
    return 1.17 * Math.sqrt(BiomeApi.planetRadiusM() / EARTH_RADIUS_M) * (a + b);
  }

  /** Bearing, range and clear-air reach to a target at `to` standing `targetM` tall. */
  lineTo(to: GeoPosition, targetM: number): Sightline {
    return {
      bearingDeg: this.at.bearingTo(to),
      rangeNm: this.at.distanceNm(to),
      clearNm: this.reachNm(targetM),
    };
  }

  /**
   * The sightline to `to` when it is in sight — within reach once the
   * weather's factor `seeing` (1 clear, a tenth in fog) has shortened it —
   * else `null`.
   */
  sight(to: GeoPosition, targetM: number, seeing = 1): Sightline | null {
    const line = this.lineTo(to, targetM);
    return line.rangeNm <= line.clearNm * seeing ? line : null;
  }
}
