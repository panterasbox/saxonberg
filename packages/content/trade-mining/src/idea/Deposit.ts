/**
 * Deposit — the model half of the geology field.
 *
 * Three layers, exactly as field-substrate-slate names them:
 *
 *   - **the model** is this class: a pure-data `Idea` (the `Material` /
 *     `Biome` shape) carrying a deposit's authored STRUCTURE — the
 *     stratigraphy, the water table, the lode's plane, the grade bands,
 *     the depletion lean and the authored feature pins;
 *   - **the instantiation** is the zone that names a row of it, with the
 *     seed derived from the covering Locality's address rather than
 *     authored ({@link Deposit.seedFor}, the `WeatherLogic.localitySeed`
 *     rule);
 *   - **the values** are computed and stored NOWHERE.
 *
 * ⭐ **One resolved read, and no raw branch.** {@link Deposit.sampleAt}
 * folds authored **pin** over authored **lean** over the **procedural**
 * value, in that order, and returns one shape. Nothing downstream may
 * reach past it — which is what makes an authored pocket and a computed
 * cell indistinguishable to every consumer, the invariant the weather
 * spine already keeps. {@link Deposit.surfaceReadingAt} is the second
 * read; it is a projection of the same plane parameters and consults
 * nothing else.
 *
 * ⚠ **Nothing here rolls.** `uncertainty.md`'s resolutional ban is not
 * *"prefer determinism"* — it is *never roll to decide what your action
 * DID*. The ground was always there; the seed is position, and the
 * player's uncertainty is **epistemic**. Two boots, two processes, one
 * answer: the hash is FNV-1a over the cell string, which is
 * process-independent by construction.
 *
 * ⚠ **The class is trade content; an orebody is NOT.** A deposit is a
 * PLACE, so every row of this class belongs to a venue pack. This pack
 * ships the class and no ore.
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

/**
 * A point in the ground, **in metres**, z negative going down.
 *
 * ⭐ Metres, not grid cells, and that is deliberate: a deposit is a fact
 * about the rock, and the rock does not know what cell size somebody
 * chose for the workings cut through it. An author writes
 * `waterTable: -45` and means forty-five metres; {@link Working}
 * multiplies its cell by the zone's `cellSize` on the way in. Two mines
 * at different cell sizes can name the same seam.
 */
export type Point = readonly [number, number, number];

/**
 * One stratigraphic band, top-down: the country rock from the band above
 * (or the surface) down to `toZ`. The last band is the floor of the
 * authored column; below it, the deepest band continues.
 */
export interface StratumBand {
  /** The band's bottom, in zone metres (negative = below the collar). */
  toZ: number;
  /** The host rock's `Material` template path. */
  host: string;
}

/**
 * One mineralization band, top-down. Above the water table an oxide cap;
 * below it, the primary sulfides. The band decides WHICH mineral the
 * lode carries at this depth and the mean grade it carries it at.
 */
export interface GradeBand {
  toZ: number;
  /** The ore mineral's `Material` template path. */
  mineral: string;
  /** Mean ore fraction by mass in lode rock, 0–1. */
  meanGrade: number;
  /** Half-width of the procedural spread around the mean, 0–1. */
  spread: number;
}

/**
 * The lode — one plane in the ground, with a thickness and a finite
 * extent. `strike` is the azimuth of the horizontal line lying in the
 * plane (degrees clockwise from +y); `dip` is the angle the plane falls
 * from horizontal (degrees), down to the right of the strike direction.
 *
 * ⭐ `strike` and `dip` **are** θ and φ: a plane in the ground is two
 * angles and an offset, which is why the survey can solve it from three
 * points and why the player is doing real geometry rather than opening
 * a chest.
 */
export interface Lode {
  /** A point the plane passes through, in zone metres. */
  through: readonly [number, number, number];
  /** Azimuth of the strike line, degrees clockwise from +y. */
  strike: number;
  /** Fall from horizontal, degrees (0 = flat-lying, 90 = vertical). */
  dip: number;
  /** True thickness normal to the plane, metres. */
  thickness: number;
  /** Half-extent along strike from `through`, metres. */
  strikeExtent: number;
  /** Half-extent down dip from `through`, metres. */
  dipExtent: number;
  /** The worthless mineral that comes up with the ore. */
  gangue: string;
}

/**
 * An authored lean over a region: everything inside the box has its
 * COMPUTED grade scaled. The old men worked the shallow ground first, so
 * what is left there is what they would not stoop for — and this says so
 * without replacing the procedural value underneath it.
 */
export interface DepletionBand {
  from: readonly [number, number, number];
  to: readonly [number, number, number];
  /** Multiplier on the computed grade, 0–1. */
  scale: number;
  /** Why — authoring documentation, not read by anything. */
  reason?: string;
}

/** An authored pin: one cell the author decided, overriding everything. */
export interface FeaturePin {
  /** A feature key the room prose and the chamber seam read. */
  feature?: string;
  /** Force the mineral here (a pocket of something else). */
  mineral?: string;
  /** Force the grade here, 0–1. */
  grade?: number;
  /** Force the host rock here. */
  host?: string;
}

/** The authored feature layer: hand-placed cells and seeded pocket rules. */
export interface DepositFeatures {
  /** Point key (`"x,y,z"`) → the authored fact at that cell. */
  pins?: Record<string, FeaturePin>;
  /**
   * Feature keys the procedural layer may place, with the per-cell
   * probability it places them at. Seeded, never drawn — the roll is
   * `roll01(seed, cell)`, so the pocket was always there.
   */
  seeded?: Array<{ feature: string; chance: number; inLodeOnly?: boolean }>;
}

/**
 * ⭐ The one resolved read's answer. An authored pin and a computed cell
 * produce this same shape with no marker distinguishing them — which is
 * the point.
 */
export interface GroundSample {
  /** The country rock's `Material` path at this cell. */
  hostPath: string;
  /** Indentation hardness of the host, MPa — what carve cost is priced on. */
  hardnessMPa: number;
  /** Is this cell inside the lode's plane, thickness and extent? */
  inLode: boolean;
  /** The ore mineral here, or `null` in barren ground. */
  mineralPath: string | null;
  /** The gangue that comes up with it, or `null` in barren ground. */
  ganguePath: string | null;
  /** Ore fraction by mass, 0–1. Zero in barren ground. */
  grade: number;
  /** Wetness, 0–1. 1 below the water table; a damp gradient above it. */
  water: number;
  /** An authored or seeded feature key, or `null`. */
  feature: string | null;
}

/**
 * What a surveyor reads standing on the ground above the lode. Contains
 * ⚠ **no dip information whatever**, and that is by construction rather
 * than by a gate: the surface trace is the plane's intersection with
 * `z = 0`, and a line carries the strike of the plane it came from and
 * nothing else. `measure dip` underground answers the other half — which
 * is the push-your-luck decision arriving as a missing parameter.
 */
export interface SurfaceReading {
  /** Perpendicular distance in the horizontal plane to the outcrop trace, metres. */
  distanceM: number;
  /** How strongly the ore stains the ground here, 0–1. */
  staining: number;
  /**
   * The TRUE azimuth of the trace, degrees. ⭐ Identical for every
   * observer regardless of competence — competence buys resolution, never
   * outcome, and the test asserts this identity rather than the
   * presentation.
   */
  strikeDeg: number;
  /**
   * The reading this observation point actually yields — the truth plus a
   * SEEDED per-point offset scaled by `errorDeg`. Seeded, not drawn: two
   * observers at one point read the same wrong number, and returning to
   * the point does not re-roll it.
   */
  readingDeg: number;
  /** The observation's half-width, degrees. Set by the reader's band. */
  errorDeg: number;
}

/** The default host hardness when a stratum names a row that is not resident. */
const DEFAULT_HARDNESS_MPA = 150;

/** Degrees → radians. */
const RAD = Math.PI / 180;

export default class Deposit extends Idea {
  /** Display name (`'ferrow'`). */
  protected name: string = '';

  /** Country rock by depth, top-down. */
  protected stratigraphy: StratumBand[] = [];

  /**
   * The depth at or below which the ground is saturated, in zone metres
   * (negative). ⭐ Stage A's whole scope boundary: an adit drains by
   * gravity, the oxide cap is physically above this line, and everything
   * that needs a pump is on the other side of it.
   */
  protected waterTable: number = -45;

  /** The orebody's plane. `null` in a deposit with no lode (barren ground). */
  protected lode: Lode | null = null;

  /** Mineralization by depth, top-down. */
  protected zones: GradeBand[] = [];

  /** Authored leans over the computed grade. */
  protected depletion: DepletionBand[] = [];

  /** Authored pins and seeded pocket rules. */
  protected features: DepositFeatures = {};

  static fieldMeta: FieldMeta = {
    name: { persistent: true, authorable: true },
    // ⭐ Level-1 spoiler, `spoilerName: 0` — the `Biome` cut, and for the
    // same reason. WHICH parameters a deposit has is public (a reader
    // should see that strike and dip exist to be measured); what they ARE
    // is the thing an instrument earns, and a wiki page should not hand it
    // out for free.
    stratigraphy: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
    waterTable: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
    lode: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
    zones: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
    depletion: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
    features: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
  };

  // ---------- authored surface ----------

  public getName(): string { return this.name; }
  public setName(value: string): void { this.name = value; }

  public getStratigraphy(): readonly StratumBand[] { return this.stratigraphy; }
  public setStratigraphy(value: StratumBand[]): void { this.stratigraphy = value ?? []; }

  public getWaterTable(): number { return this.waterTable; }
  public setWaterTable(value: number): void { this.waterTable = value; }

  public getLode(): Lode | null { return this.lode; }
  public setLode(value: Lode | null): void { this.lode = value ?? null; }

  public getZones(): readonly GradeBand[] { return this.zones; }
  public setZones(value: GradeBand[]): void { this.zones = value ?? []; }

  public getDepletion(): readonly DepletionBand[] { return this.depletion; }
  public setDepletion(value: DepletionBand[]): void { this.depletion = value ?? []; }

  public getFeatures(): DepositFeatures { return this.features; }
  public setFeatures(value: DepositFeatures): void { this.features = value ?? {}; }

  // ---------- the seed ----------

  /**
   * The deposit's procedural seed, DERIVED from the covering Locality's
   * claimed address — `WeatherLogic.localitySeed`'s exact rule,
   * re-implemented here rather than factored into a shared `FieldApi`
   * (field-substrate-slate Open 2: two instances is where a pattern is
   * NAMED, not where it is extracted).
   *
   * ⭐ **No seed is stored anywhere.** Rename the mine and its ore moves;
   * no author manages a magic number, and no row can drift from the
   * world it describes.
   */
  public static seedFor(address: string): number {
    return (hashString(address) ^ BASE_SEED) >>> 0;
  }

  // ---------- ⭐ the one resolved read ----------

  /**
   * Everything true of one cell. **The fold order is the spine
   * invariant**: an authored `features.pins` entry wins over an authored
   * `depletion` lean, which scales — never replaces — the procedural
   * value underneath.
   *
   * @param at the point in the ground, in metres
   * @param seed {@link Deposit.seedFor} of the covering Locality's address
   */
  public sampleAt(at: Point, seed: number): GroundSample {
    const key = pointKey(at);
    const pin = this.features?.pins?.[key];

    const hostPath = pin?.host ?? this.hostAt(at[2]);
    const water = this.waterAt(at[2]);

    const inLode = this.isInLode(at);
    const band = this.bandAt(at[2]);

    // The procedural grade: the band's mean, spread by the cell's own
    // seeded roll. Barren ground is the default and the common case.
    let grade = 0;
    let mineralPath: string | null = null;
    let ganguePath: string | null = null;
    if (inLode && band !== null) {
      mineralPath = band.mineral;
      ganguePath = this.lode?.gangue ?? null;
      const r = roll01(seed, hashString(key));
      grade = clamp01(band.meanGrade + band.spread * (2 * r - 1));
      grade *= this.depletionScaleAt(at);
    }

    // The pin wins outright — but only over the fields it states.
    if (pin?.mineral !== undefined) {
      mineralPath = pin.mineral;
      ganguePath = ganguePath ?? this.lode?.gangue ?? null;
    }
    if (pin?.grade !== undefined) grade = clamp01(pin.grade);

    return {
      hostPath,
      hardnessMPa: hardnessOf(hostPath),
      inLode: inLode || pin?.mineral !== undefined || (pin?.grade ?? 0) > 0,
      mineralPath: grade > 0 ? mineralPath : null,
      ganguePath: grade > 0 ? ganguePath : null,
      grade,
      water,
      feature: pin?.feature ?? this.seededFeatureAt(at, seed, inLode),
    };
  }

  /**
   * The surface half: what the ground above the lode says, at
   * `(x, y)`, read to `errorDeg` resolution.
   *
   * ⚠ Returns `null` where the lode has no surface trace at all — a
   * deposit with no lode, or one whose plane never reaches `z = 0`
   * within its extent. **A barren survey is a legitimate, informative
   * outcome**, and the caller reports the negative rather than swallowing
   * it.
   */
  public surfaceReadingAt(x: number, y: number, errorDeg: number, seed: number): SurfaceReading | null {
    const lode = this.lode;
    if (lode === null) return null;

    // The surface trace is the plane's intersection with z = 0. Its
    // direction is the strike vector (which lies in the plane and is
    // horizontal by definition), so the trace is a line through the
    // plane's z = 0 crossing, running along strike.
    const n = normalOf(lode);
    const p0 = lode.through;
    // Perpendicular distance in the HORIZONTAL plane from (x, y, 0) to
    // the trace: the 3D plane distance of (x,y,0), rescaled by the
    // horizontal component of the normal. A flat-lying lode has no
    // horizontal normal and therefore no trace to stand beside.
    const nH = Math.hypot(n[0], n[1]);
    if (nH < 1e-9) return null;
    const planeDist = (x - p0[0]) * n[0] + (y - p0[1]) * n[1] + (0 - p0[2]) * n[2];
    const distanceM = planeDist / nH;

    // Off the end of the body along strike is off the map: the trace
    // exists only where the lode does.
    const s = strikeVector(lode);
    const along = (x - p0[0]) * s[0] + (y - p0[1]) * s[1];
    if (Math.abs(along) > lode.strikeExtent) return null;

    // Staining falls off with distance from the trace, over a width
    // proportional to the body's own thickness — a thick lode stains a
    // wider band, which is what makes a fat body easier to find.
    const halo = Math.max(lode.thickness, 1) * 2;
    const staining = clamp01(1 - Math.abs(distanceM) / halo);

    // ⭐ The truth, then the observation. `strikeDeg` is identical for
    // every reader; `readingDeg` carries a SEEDED offset scaled by the
    // reader's band, so the same point read twice reads the same.
    const strikeDeg = norm360(lode.strike);
    const offset = (2 * roll01(seed, hashString(`surface:${x},${y}`)) - 1) * errorDeg;
    return {
      distanceM,
      staining,
      strikeDeg,
      readingDeg: norm360(strikeDeg + offset),
      errorDeg,
    };
  }

  /**
   * The dip, read off an exposed face underground. ⭐ `null` unless the
   * cell is actually IN the lode — you measure dip on the vein, and the
   * surface has none to offer.
   */
  public dipReadingAt(at: Point, errorDeg: number, seed: number): { dipDeg: number; readingDeg: number; errorDeg: number } | null {
    const lode = this.lode;
    if (lode === null || !this.isInLode(at)) return null;
    const dipDeg = lode.dip;
    const offset = (2 * roll01(seed, hashString(`dip:${pointKey(at)}`)) - 1) * errorDeg;
    return { dipDeg, readingDeg: clampDip(dipDeg + offset), errorDeg };
  }

  // ---------- the structural reads the fold is built from ----------

  /** The country rock at depth `z`. The deepest authored band continues down. */
  public hostAt(z: number): string {
    for (const band of this.stratigraphy) {
      if (z >= band.toZ) return band.host;
    }
    const last = this.stratigraphy[this.stratigraphy.length - 1];
    return last?.host ?? DEFAULT_HOST;
  }

  /** The mineralization band at depth `z`, or `null` below the deepest. */
  public bandAt(z: number): GradeBand | null {
    for (const band of this.zones) {
      if (z >= band.toZ) return band;
    }
    return this.zones[this.zones.length - 1] ?? null;
  }

  /**
   * Wetness at depth `z`, 0–1. Saturated at and below the water table;
   * a linear damp gradient for the ten metres above it, dry over that.
   * ⭐ The gradient is the free warning that you are approaching the
   * boundary Stage A's adit cannot cross.
   */
  public waterAt(z: number): number {
    if (z <= this.waterTable) return 1;
    const above = z - this.waterTable;
    return clamp01(1 - above / 10);
  }

  /** Is this cell inside the lode's plane, thickness and finite extent? */
  public isInLode(at: Point): boolean {
    const lode = this.lode;
    if (lode === null) return false;
    const p0 = lode.through;
    const d: [number, number, number] = [at[0] - p0[0], at[1] - p0[1], at[2] - p0[2]];
    const n = normalOf(lode);
    const perp = Math.abs(d[0] * n[0] + d[1] * n[1] + d[2] * n[2]);
    if (perp > lode.thickness / 2) return false;
    const s = strikeVector(lode);
    if (Math.abs(d[0] * s[0] + d[1] * s[1]) > lode.strikeExtent) return false;
    const dv = dipVector(lode);
    if (Math.abs(d[0] * dv[0] + d[1] * dv[1] + d[2] * dv[2]) > lode.dipExtent) return false;
    return true;
  }

  /** The authored lean's multiplier at a cell — 1 where nothing is declared. */
  private depletionScaleAt(at: Point): number {
    let scale = 1;
    for (const b of this.depletion) {
      const inside =
        at[0] >= Math.min(b.from[0], b.to[0]) && at[0] <= Math.max(b.from[0], b.to[0]) &&
        at[1] >= Math.min(b.from[1], b.to[1]) && at[1] <= Math.max(b.from[1], b.to[1]) &&
        at[2] >= Math.min(b.from[2], b.to[2]) && at[2] <= Math.max(b.from[2], b.to[2]);
      if (inside) scale *= b.scale;
    }
    return scale;
  }

  /** A seeded feature at this cell, or `null`. Seeded, never drawn. */
  private seededFeatureAt(at: Point, seed: number, inLode: boolean): string | null {
    const rules = this.features?.seeded ?? [];
    for (const rule of rules) {
      if (rule.inLodeOnly === true && !inLode) continue;
      const r = roll01(seed ^ hashString(rule.feature), hashString(pointKey(at)));
      if (r < rule.chance) return rule.feature;
    }
    return null;
  }
}

/** The fallback country rock when a deposit authors no stratigraphy. */
const DEFAULT_HOST = '/stuff/idea/material/rock/granite';

/**
 * The global base seed the address is XOR'd against — the weather
 * spine's constant, re-stated rather than imported (a pack does not
 * reach into a kernel logic singleton's private constants).
 */
const BASE_SEED = 0x5a10f00d;

/** A point → its canonical key string, and the hash's whole input. */
function pointKey(at: Point): string {
  return `${at[0]},${at[1]},${at[2]}`;
}

/** FNV-1a 32-bit string hash — deterministic and process-independent. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Integer avalanche mix of two 32-bit words → a 32-bit hash. */
function mix2(a: number, b: number): number {
  let h = (a ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (b >>> 0), 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** Deterministic value in [0, 1) from two seed words. */
function roll01(a: number, b: number): number {
  return mix2(a >>> 0, b >>> 0) / 0x1_0000_0000;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function norm360(deg: number): number {
  const d = deg % 360;
  return d < 0 ? d + 360 : d;
}

function clampDip(deg: number): number {
  return deg < 0 ? 0 : deg > 90 ? 90 : deg;
}

/** The unit vector along the strike line: horizontal, in the plane. */
function strikeVector(lode: Lode): [number, number, number] {
  const f = lode.strike * RAD;
  return [Math.sin(f), Math.cos(f), 0];
}

/** The unit vector down the dip: in the plane, steepest descent. */
function dipVector(lode: Lode): [number, number, number] {
  const f = lode.strike * RAD;
  const d = lode.dip * RAD;
  return [Math.cos(f) * Math.cos(d), -Math.sin(f) * Math.cos(d), -Math.sin(d)];
}

/** The plane's unit normal — `strike × dip`, which is already unit-length. */
function normalOf(lode: Lode): [number, number, number] {
  const f = lode.strike * RAD;
  const d = lode.dip * RAD;
  return [-Math.cos(f) * Math.sin(d), Math.sin(f) * Math.sin(d), -Math.cos(d)];
}

/**
 * The host rock's indentation hardness, off the resolved `Material`.
 *
 * ⭐ This is why granite gained `hardness` and slate was minted: **carve
 * cost cannot be priced until rock carries what metal already does.** A
 * stratum naming a row that is not resident falls back to a documented
 * middling value rather than pricing the heading at zero — a silent
 * free-digging bug is far worse than a slightly wrong one.
 */
function hardnessOf(materialPath: string): number {
  const m = StuffApi.findByTemplatePath<Material>(materialPath);
  if (!m) return DEFAULT_HARDNESS_MPA;
  const h = m.getHardness().rawValue();
  return h > 0 ? h : DEFAULT_HARDNESS_MPA;
}
