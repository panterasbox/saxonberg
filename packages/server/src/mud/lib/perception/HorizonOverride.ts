/**
 * HorizonOverride — an author's word on a place's horizon (geography D5):
 * what may NOT be seen from here, and what is seen whatever the rule says.
 *
 * The rule decides the horizon (a skyline by curvature, the craft of the
 * frame you are on); an override only ever narrows it or names an addition:
 *
 * ```yaml
 * horizon:
 *   block: all                                   # nothing from in here
 *   block: [{ from: 20, to: 110, beyondNm: 2 }]  # the ridge: nothing past two miles, NNE to ESE
 *   reach: [/stuff/idea/WaterExpanse/greywater]  # look out on a sea (its craft, read at the act)
 * ```
 *
 * - `block` — `all`, or sectors in degrees true, clockwise `from` → `to`,
 *   blocking what lies beyond `beyondNm` (default 0). Static and moving
 *   sightings alike.
 * - `reach` — an EXPANSE (its craft are read from here at the act: how a
 *   shore place looks out on a sea) or a STRUCTURE row (listed whatever
 *   curvature and the handful cut say; the sky, the weather and the night
 *   still apply).
 *
 * ⚠ The shape is checked when it is set: the old list-of-zones form and an
 * unknown key THROW (there is no migration and no compatibility read).
 * Hosted on `SpatialZone` and `Place` — the nearest declaration wins.
 *
 * Immutable; persisted as its plain record ({@link HorizonOverrideRecord}).
 */

/** One blocked arc. */
export interface HorizonSector {
  /** Degrees true where the arc starts (clockwise). */
  from: number;
  /** Degrees true where it ends. */
  to: number;
  /** Nothing past this many nautical miles in the arc is seen (default 0 — nothing at all). */
  beyondNm?: number;
}

/** The authored, persisted shape. */
export interface HorizonOverrideRecord {
  block?: 'all' | HorizonSector[];
  reach?: string[];
}

const KEYS = new Set(['block', 'reach']);

export class HorizonOverride {
  readonly blockAll: boolean;
  readonly sectors: readonly Required<HorizonSector>[];
  readonly reach: readonly string[];

  constructor(raw: HorizonOverrideRecord) {
    if (Array.isArray(raw) || raw === null || typeof raw !== 'object') {
      throw new RangeError(
        'horizon: expected { block?, reach? } — the list-of-zones form is retired (geography D5); ' +
          `got ${JSON.stringify(raw)}`,
      );
    }
    for (const k of Object.keys(raw)) {
      if (!KEYS.has(k)) throw new RangeError(`horizon: unknown key '${k}' (block | reach)`);
    }
    const block = raw.block;
    this.blockAll = block === 'all';
    const sectors: Required<HorizonSector>[] = [];
    if (block !== undefined && block !== 'all') {
      if (!Array.isArray(block)) throw new RangeError(`horizon.block: 'all' or a list of sectors; got ${JSON.stringify(block)}`);
      for (const s of block) {
        const from = Number(s?.from);
        const to = Number(s?.to);
        const beyondNm = s?.beyondNm === undefined ? 0 : Number(s.beyondNm);
        if (![from, to, beyondNm].every(Number.isFinite) || beyondNm < 0) {
          throw new RangeError(`horizon.block: a sector is { from, to, beyondNm? ≥ 0 } in degrees; got ${JSON.stringify(s)}`);
        }
        sectors.push({ from: ((from % 360) + 360) % 360, to: ((to % 360) + 360) % 360, beyondNm });
      }
    }
    this.sectors = sectors;
    const reach = raw.reach ?? [];
    if (!Array.isArray(reach) || reach.some((p) => typeof p !== 'string' || !p.startsWith('/'))) {
      throw new RangeError(`horizon.reach: a list of template paths; got ${JSON.stringify(reach)}`);
    }
    this.reach = reach;
  }

  /**
   * Is a sighting on `bearingDeg` at `rangeNm` blocked? A sighting with no
   * bearing (named only, or close by) is blocked only by `all`.
   */
  blocks(bearingDeg: number | null, rangeNm: number | null): boolean {
    if (this.blockAll) return true;
    if (bearingDeg === null) return false;
    const b = ((bearingDeg % 360) + 360) % 360;
    return this.sectors.some((s) => {
      const inArc = s.from <= s.to ? b >= s.from && b <= s.to : b >= s.from || b <= s.to;
      return inArc && (rangeNm ?? Infinity) > s.beyondNm;
    });
  }

  toJSON(): HorizonOverrideRecord {
    const out: HorizonOverrideRecord = {};
    if (this.blockAll) out.block = 'all';
    else if (this.sectors.length > 0) out.block = this.sectors.map((s) => ({ ...s }));
    if (this.reach.length > 0) out.reach = [...this.reach];
    return out;
  }
}
