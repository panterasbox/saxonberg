/**
 * GeoPosition — a point on the CHART: latitude and longitude, the
 * sailor's register.
 *
 * ⭐⭐ Two systems, one place (maritime review, 2026-10-13). The expanse's
 * GRAPH is spherical — a node is authored as a focus `[rho, theta, phi]`
 * and a `radius` RELATIVE TO ITS EXPANSE, exactly as a `SphericalLocation`
 * is relative to its zone — and the CHART is this: a craft's position,
 * its course, its reckoning, a sight, a bearing. The expanse authors one
 * `origin` on the chart and {@link GeoPosition.atFocus} is the bridge, so
 * the two never describe different things.
 *
 * The PLOT is plane sailing: over the distances a watch covers, the
 * sphere is flat enough that a course and a distance convert to a change
 * of latitude and a departure scaled by `cos(latitude)`. The conversion
 * is arithmetic and it is what a navigator with a traverse table does, so
 * it is also what the engine does.
 *
 * `depthM` is the column's axis. It exists and is always `0` in the
 * maritime build — nothing writes a second value until the underwater
 * build gives it one (requirements AC 38).
 *
 * Immutable. Persisted as its plain record ({@link GeoPositionRecord}) —
 * the value is rebuilt on read, so no marshaller row is needed.
 */

/** Nautical miles in one minute of latitude — the unit's definition. */
import { BiomeApi } from '../../api/biome';

/** Nautical miles per degree on an Earth-sized planet — a minute of arc each. */
const EARTH_NM_PER_DEGREE = 60;
/** Earth's mean radius, metres. */
const EARTH_RADIUS_M = 6_371_000;

/**
 * ⭐ Nautical miles per degree on THIS world (sugar D12): the chart
 * re-derives from the planet's radius, so on a world a third of Earth's a
 * degree is twenty miles. A nautical mile stays 1852 m — the metres of
 * every authored focus never move; the degrees they come to do.
 */
function nmPerDegree(): number {
  const r = BiomeApi.planetRadiusM();
  return r === EARTH_RADIUS_M ? EARTH_NM_PER_DEGREE : (2 * Math.PI * r) / 360 / M_PER_NM;
}

/** The plain, JSON-safe shape a position persists and is authored as. */
export interface GeoPositionRecord {
  latDeg: number;
  lonDeg: number;
  depthM?: number;
}

/** Metres in a nautical mile — the unit's definition. */
export const M_PER_NM = 1852;

/**
 * A point of the expanse's spherical graph, relative to its origin — the
 * shape `SphericalLocation.focus` authors, in the same units: `rho` the
 * radial distance in metres, `theta` the bearing from the origin in
 * degrees true, `phi` the inclination from the zenith in degrees (`90`,
 * the default, is on the surface; past `90` is below it).
 */
export interface FocusRecord {
  rho: number;
  theta: number;
  phi?: number;
}

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

export class GeoPosition {
  readonly latDeg: number;
  readonly lonDeg: number;
  readonly depthM: number;

  /**
   * Build from degrees, or from an authored / persisted record (the
   * record form is how a stored position comes back to life).
   */
  constructor(latOrRecord: number | GeoPositionRecord, lonDeg = 0, depthM = 0) {
    let latDeg: number;
    if (typeof latOrRecord === 'number') {
      latDeg = latOrRecord;
    } else {
      latDeg = latOrRecord.latDeg;
      lonDeg = latOrRecord.lonDeg;
      depthM = latOrRecord.depthM ?? 0;
    }
    if (!Number.isFinite(latDeg) || !Number.isFinite(lonDeg)) {
      throw new Error(`GeoPosition: non-finite (${latDeg}, ${lonDeg})`);
    }
    this.latDeg = Math.max(-90, Math.min(90, latDeg));
    this.lonDeg = GeoPosition.wrapLon(lonDeg);
    this.depthM = depthM;
  }

  /** Longitude into `[-180, 180)`. */
  private static wrapLon(lonDeg: number): number {
    const w = ((((lonDeg + 180) % 360) + 360) % 360) - 180;
    return Object.is(w, -0) ? 0 : w;
  }

  /** Signed longitude difference `to − from`, the short way round. */
  private static dLon(from: number, to: number): number {
    return GeoPosition.wrapLon(to - from);
  }

  /** North and east components, in nautical miles, from here to `to`. */
  offsetTo(to: GeoPosition): { northNm: number; eastNm: number } {
    const midLat = toRad((this.latDeg + to.latDeg) / 2);
    return {
      northNm: (to.latDeg - this.latDeg) * nmPerDegree(),
      eastNm: GeoPosition.dLon(this.lonDeg, to.lonDeg) * nmPerDegree() * Math.cos(midLat),
    };
  }

  /** Plane-sailing distance, nautical miles. */
  distanceNm(to: GeoPosition): number {
    const { northNm, eastNm } = this.offsetTo(to);
    return Math.hypot(northNm, eastNm);
  }

  /** True bearing to `to`, degrees clockwise from north, `[0, 360)`. */
  bearingTo(to: GeoPosition): number {
    const { northNm, eastNm } = this.offsetTo(to);
    if (northNm === 0 && eastNm === 0) return 0;
    return (toDeg(Math.atan2(eastNm, northNm)) + 360) % 360;
  }

  /** The point `nm` miles away on a true bearing (plane sailing). */
  destination(bearingDeg: number, nm: number): GeoPosition {
    const b = toRad(bearingDeg);
    const dLat = (nm * Math.cos(b)) / nmPerDegree();
    const midLat = toRad(this.latDeg + dLat / 2);
    const cos = Math.max(1e-6, Math.cos(midLat));
    const dLon = (nm * Math.sin(b)) / (nmPerDegree() * cos);
    return new GeoPosition(this.latDeg + dLat, this.lonDeg + dLon, this.depthM);
  }

  /**
   * ⭐ The bridge: where the graph point `focus` (relative to THIS
   * position, an expanse's origin) lies on the chart. The surface run is
   * `rho·sin(phi)` along bearing `theta`; the depth is `−rho·cos(phi)`.
   */
  atFocus(focus: FocusRecord): GeoPosition {
    const rho = Number(focus.rho);
    const theta = Number(focus.theta);
    const phi = focus.phi === undefined ? 90 : Number(focus.phi);
    if (!Number.isFinite(rho) || !Number.isFinite(theta) || !Number.isFinite(phi) || rho < 0) {
      throw new Error(`GeoPosition.atFocus: a focus needs finite rho ≥ 0, theta, phi; got ${JSON.stringify(focus)}`);
    }
    const run = rho * Math.sin(toRad(phi));
    const depth = Math.max(0, -rho * Math.cos(toRad(phi)));
    const p = this.destination(theta, run / M_PER_NM);
    // ⚠ Rounded off the float noise: an authored surface point is depth 0.
    return new GeoPosition(p.latDeg, p.lonDeg, Math.round(depth * 1000) / 1000);
  }

  /** Displace by north/east nautical miles (a current's set). */
  displaced(northNm: number, eastNm: number): GeoPosition {
    const dLat = northNm / nmPerDegree();
    const midLat = toRad(this.latDeg + dLat / 2);
    const dLon = eastNm / (nmPerDegree() * Math.max(1e-6, Math.cos(midLat)));
    return new GeoPosition(this.latDeg + dLat, this.lonDeg + dLon, this.depthM);
  }

  /** Linear interpolation along the plotted segment, `t ∈ [0, 1]`. */
  lerp(to: GeoPosition, t: number): GeoPosition {
    return new GeoPosition(
      this.latDeg + (to.latDeg - this.latDeg) * t,
      this.lonDeg + GeoPosition.dLon(this.lonDeg, to.lonDeg) * t,
      this.depthM
    );
  }

  equals(other: GeoPosition | null): boolean {
    return other !== null &&
      other.latDeg === this.latDeg &&
      other.lonDeg === this.lonDeg &&
      other.depthM === this.depthM;
  }

  toJSON(): GeoPositionRecord {
    return { latDeg: this.latDeg, lonDeg: this.lonDeg, depthM: this.depthM };
  }

  /** Words a navigator writes: `50°12.0'N 4°03.5'W`. */
  toString(): string {
    const fmt = (v: number, pos: string, neg: string): string => {
      const a = Math.abs(v);
      const d = Math.floor(a);
      const m = (a - d) * 60;
      return `${d}°${m.toFixed(1).padStart(4, '0')}'${v >= 0 ? pos : neg}`;
    };
    return `${fmt(this.latDeg, 'N', 'S')} ${fmt(this.lonDeg, 'E', 'W')}`;
  }
}
