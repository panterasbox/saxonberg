/**
 * GeoPosition — a point in an Expanse's geographic frame.
 *
 * ⭐ The FRAME is geographic (latitude and longitude, so a node may sit
 * anywhere and never on a lattice) and the PLOT is plane sailing: over
 * the distances a watch covers, the sphere is flat enough that a course
 * and a distance convert to a change of latitude and a departure scaled
 * by `cos(latitude)`. The conversion is arithmetic and it is what a
 * navigator with a traverse table does, so it is also what the engine
 * does.
 *
 * `depthM` is the column's axis. It exists and is always `0` in the
 * maritime build — nothing writes a second value until the underwater
 * build gives it one (requirements AC 38).
 *
 * Immutable. Persisted as its plain record ({@link GeoPositionRecord}) —
 * the value is rebuilt on read, so no marshaller row is needed.
 */

/** Nautical miles in one minute of latitude — the unit's definition. */
const NM_PER_DEGREE = 60;

/** The plain, JSON-safe shape a position persists and is authored as. */
export interface GeoPositionRecord {
  latDeg: number;
  lonDeg: number;
  depthM?: number;
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
      northNm: (to.latDeg - this.latDeg) * NM_PER_DEGREE,
      eastNm: GeoPosition.dLon(this.lonDeg, to.lonDeg) * NM_PER_DEGREE * Math.cos(midLat),
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
    const dLat = (nm * Math.cos(b)) / NM_PER_DEGREE;
    const midLat = toRad(this.latDeg + dLat / 2);
    const cos = Math.max(1e-6, Math.cos(midLat));
    const dLon = (nm * Math.sin(b)) / (NM_PER_DEGREE * cos);
    return new GeoPosition(this.latDeg + dLat, this.lonDeg + dLon, this.depthM);
  }

  /** Displace by north/east nautical miles (a current's set). */
  displaced(northNm: number, eastNm: number): GeoPosition {
    const dLat = northNm / NM_PER_DEGREE;
    const midLat = toRad(this.latDeg + dLat / 2);
    const dLon = eastNm / (NM_PER_DEGREE * Math.max(1e-6, Math.cos(midLat)));
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
