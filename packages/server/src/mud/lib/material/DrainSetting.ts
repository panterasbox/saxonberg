/**
 * DrainSetting — ⭐ **how a matter sets by losing water**, as data on its
 * material row (dairy D9b): curd gives up its whey in a hoop and becomes
 * cheese, faster and drier under a load; a sugar strike purges its
 * molasses in a cone; a slip gives its water to a plaster mould.
 *
 * The drain set's twin is the cure (`Kinetics.poolSet()`), and the two have
 * one shape (B104): the MATERIAL says how it sets — the rate, the moisture
 * it keeps under a given pressing, what drains off — and the MOULD holds how
 * far the set has gone and what shape it takes. The mould integrates; this
 * evaluates.
 *
 * ```yaml
 * drainSetting:
 *   days: 2                      # to set, unloaded
 *   moisture: { unloaded: 0.55, loaded: 0.4 }
 *   loadRef: 1                   # a load of poolKg × loadRef × g doubles the pace
 *   becomes: /stuff/idea/material/cheese/hard
 *   drains: /stuff/idea/material/whey   # what runs off, to a vessel below
 * ```
 */

/** The authored shape of a drain set (the row's `drainSetting:`). */
export interface DrainSettingSpec {
  days: number;
  becomes?: string;
  /**
   * ⭐ What the set thing is when it sets AS a given shape — keyed by the
   * cast's template path, falling back to `becomes` (sugar: the strike
   * set as a cone's loaf is loaf sugar; set as a hogshead's block, purged
   * coarse and never clayed, it is raw sugar). The mould decides the
   * shape; this lets the material say what that shape of it is.
   */
  becomesAs?: Record<string, string>;
  moisture: { unloaded: number; loaded: number };
  loadRef: number;
  /**
   * ⭐ What the drained-off matter IS (sugar D16) — molasses off a sugar
   * loaf. When set, a mould standing ON a vessel credits that vessel with
   * the drainings as they drain; absent, they go nowhere (the cheese
   * hoop's whey runs off its board).
   */
  drains?: string;
  /**
   * Extra share of the pool that drains away per grade band below `fine`
   * — a poor strike gives up more molasses and keeps less sugar.
   */
  drainPerBand?: number;
  /**
   * ⭐ The MOULD drinks the water, not a drain (ceramics D24 — slip
   * casting): it sets only in an absorbent mould, the water goes into the
   * mould's own wetness, and a wetter mould drinks slower.
   */
  absorbedByMould?: boolean;
}

/** Standard gravity — a weight's load, N per kg. */
const G = 9.81;

export class DrainSetting {
  private readonly spec: DrainSettingSpec;

  /** Throws a `RangeError` on a spec that cannot be evaluated. */
  public constructor(spec: DrainSettingSpec) {
    if (!DrainSetting.isValid(spec)) {
      throw new RangeError(
        'DrainSetting: need days > 0, 0 < moisture.loaded <= moisture.unloaded <= 1, ' +
          'loadRef > 0, becomes and drains each a path or absent, becomesAs a shape → path map or absent, ' +
          'and 0 <= drainPerBand < 1',
      );
    }
    this.spec = {
      days: spec.days,
      moisture: { unloaded: spec.moisture.unloaded, loaded: spec.moisture.loaded },
      loadRef: spec.loadRef,
      ...(spec.becomes ? { becomes: spec.becomes } : {}),
      ...(spec.absorbedByMould === true ? { absorbedByMould: true } : {}),
      ...(spec.becomesAs ? { becomesAs: { ...spec.becomesAs } } : {}),
      ...(spec.drains ? { drains: spec.drains } : {}),
      ...(spec.drainPerBand ? { drainPerBand: spec.drainPerBand } : {}),
    };
  }

  private static isValid(v: DrainSettingSpec): boolean {
    return (
      Number.isFinite(v.days) &&
      v.days > 0 &&
      v.moisture !== null &&
      typeof v.moisture === 'object' &&
      v.moisture.unloaded > 0 &&
      v.moisture.unloaded <= 1 &&
      v.moisture.loaded > 0 &&
      v.moisture.loaded <= v.moisture.unloaded &&
      Number.isFinite(v.loadRef) &&
      v.loadRef > 0 &&
      (v.becomes === undefined || (typeof v.becomes === 'string' && v.becomes !== '')) &&
      (v.absorbedByMould === undefined || typeof v.absorbedByMould === 'boolean') &&
      (v.drains === undefined || (typeof v.drains === 'string' && v.drains !== '')) &&
      (v.becomesAs === undefined ||
        (v.becomesAs !== null &&
          typeof v.becomesAs === 'object' &&
          Object.entries(v.becomesAs).every(
            ([shape, path]) => shape !== '' && typeof path === 'string' && path !== '',
          ))) &&
      (v.drainPerBand === undefined ||
        (Number.isFinite(v.drainPerBand) && v.drainPerBand >= 0 && v.drainPerBand < 1))
    );
  }

  /** The authored spec as stored (the row's own shape). */
  public toSpec(): DrainSettingSpec {
    const s = this.spec;
    return {
      ...s,
      moisture: { ...s.moisture },
      ...(s.becomesAs ? { becomesAs: { ...s.becomesAs } } : {}),
    };
  }

  /** Does the MOULD drink the water (it sets only in an absorbent one)? */
  public isAbsorbedByMould(): boolean {
    return this.spec.absorbedByMould === true;
  }

  /** What the drainings are (a material path), or `''` — they go nowhere. */
  public getDrains(): string {
    return this.spec.drains ?? '';
  }

  /**
   * The material the set thing IS when it sets as `shapePath` — the
   * shape's own answer, else `becomes`, else `''` (the pool's own).
   */
  public becomesFor(shapePath: string): string {
    return this.spec.becomesAs?.[shapePath] ?? this.spec.becomes ?? '';
  }

  /**
   * The load ratio a load of `loadN` puts on a pool of `poolKg` — uncapped,
   * since a screw press drives it far past the reference a stone reaches.
   * `0` for an absorbed drain: a load does not make plaster drink faster.
   */
  public loadRatio(loadN: number, poolKg: number): number {
    if (this.isAbsorbedByMould() || !(poolKg > 0)) return 0;
    return loadN / (poolKg * G * this.spec.loadRef);
  }

  /**
   * Set progress per game-day: an absorbed drain by how dry the mould is
   * (a wet plaster mould drinks slower); any other by its load, which can
   * at most double the pace (a stone's reach), whatever presses it.
   */
  public ratePerDay(loadRatio: number, mouldWetness: number): number {
    if (this.isAbsorbedByMould()) return Math.max(0, 1 - mouldWetness) / this.spec.days;
    return (1 + Math.min(1, loadRatio)) / this.spec.days;
  }

  /**
   * The moisture the set keeps, pressed at `pressed` (the load ratio
   * averaged over the set): from `unloaded` to `loaded` at the reference
   * load, and past it ⭐ still firming by a power law — a screw press makes
   * it firmer than a stone.
   */
  public moistureAt(pressed: number, overpressExponent: number): number {
    const m = this.spec.moisture;
    return pressed <= 1
      ? m.unloaded + (m.loaded - m.unloaded) * pressed
      : m.loaded * Math.pow(pressed, -overpressExponent);
  }

  /**
   * Kilograms the whole set drives out of a pool of `poolKg` holding
   * `waterFraction` of water, pressed at `pressed` — its water down to the
   * moisture kept, plus ⭐ the extra a poorer pool gives up
   * (`drainPerBand` × the bands below fine). Never more than the pool.
   */
  public drainedKg(
    poolKg: number,
    waterFraction: number,
    pressed: number,
    bandsBelowFine: number,
    overpressExponent: number,
  ): number {
    const kept = this.moistureAt(pressed, overpressExponent);
    const extra = (this.spec.drainPerBand ?? 0) * bandsBelowFine;
    return Math.min(poolKg, poolKg * ((1 - kept) * waterFraction + extra));
  }
}
