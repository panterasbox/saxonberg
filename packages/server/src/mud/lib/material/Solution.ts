/**
 * SolutionMixin — *it DISSOLVES, or holds what is dissolved.*
 *
 * Solubility by temperature, what it crystallizes to, what a filter strains
 * it into, its dissolved solids, the boiling-point elevation and the
 * concentration arrows of the boil-down, and what boiling purifies it to.
 *
 * A capability of a material, named for the substance's physics, never for
 * a process that reads it (material-decomposition D1). A consumer narrows
 * with `MixinApi.hasSolution(m)` and never on a material's kind.
 */

import { Idea } from '../stuff/Idea';
import { Grade } from '../craft/Grade';
import type { FieldMeta, MixinConstructor } from '../mixin';
import { MixinApi } from '../../api/mixin';
import type { Stuff } from '../stuff/Stuff';
import type { GradeBand } from '../craft/Grade';

/**
 * ⭐ One stage of a boiled-down solution (sugar D1): once the liquor's
 * dissolved-solids mass fraction reaches `fromW` on the boil plateau, it
 * becomes the material `becomes` — unless `minBand` is set and the
 * vessel's grade is below it, when it becomes `elseBecomes` instead
 * (*what will not grain is blackstrap*). The `purifiedByBoiling` shape,
 * keyed on concentration rather than time.
 */
export interface ConcentrationArrow {
  fromW: number;
  becomes: string;
  minBand?: GradeBand;
  elseBecomes?: string;
}

/**
 * ⭐ What a solution of this material sets when it holds more than it can
 * dissolve (ceramics S17): the crystals (`product`, a material path) and
 * the mother liquor left behind (`residue` — brine's is bittern). Both
 * paths; the residue may name the material itself.
 */
export interface CrystallizesTo {
  product: string;
  residue: string;
}

export interface Solution {
  getPurifiedByBoiling(): string;
  setPurifiedByBoiling(value: string): void;
  getSolidsKgPerL(): number;
  setSolidsKgPerL(value: number): void;
  solidsMassFraction(solidsKgPerL: number): number;
  getBoilingPointElevation(): ReadonlyArray<readonly [number, number]>;
  setBoilingPointElevation(value: Array<[number, number]> | null): void;
  boilingPointAt(w: number): number;
  getConcentratesTo(): readonly ConcentrationArrow[];
  setConcentratesTo(value: ConcentrationArrow[] | null): void;
  getSolubility(): ReadonlyArray<readonly [number, number]>;
  setSolubility(value: Array<[number, number]> | null): void;
  solubilityAt(tempK: number): number | null;
  getCrystallizesTo(): CrystallizesTo | null;
  setCrystallizesTo(value: CrystallizesTo | null): void;
  getFilteredTo(): string;
  setFilteredTo(value: string | null): void;
}

export function SolutionMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class SolutionMixin extends Base implements Solution {
    static _mixinName = 'SolutionMixin';

    static fieldMeta: FieldMeta = {
      // ⭐ `spoiler: 1`, matching `toxicity` — they are the same fact seen
      // from two sides. "This water poisons you" and "boiling fixes it"
      // are the two halves of the John Snow lesson, and shipping the
      // answer public while the problem is a spoiler would be
      // inconsistent AND would hand a player the last rung of the
      // counterplay ladder before they had reason to look for it.
      // `spoilerName: 0` — that the field EXISTS is public; what it names
      // is not.
      purifiedByBoiling: {
        persistent: true,
        authorable: true,
        spoiler: 1,
        spoilerName: 0,
      },
      // ── Crystallizing and the filter (ceramics W8, S17 + S9) ──
      // ⭐ The boil-down (sugar D1). Public: a sugar boiler reads the
      // thermometer and the thread, and the stages are the trade's syllabus.
      solidsKgPerL: { persistent: true, authorable: true },
      // ⭐ How much of its solute a liter of this holds at a temperature —
      // a measured fact, like the boiling point.
      solubility: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
      crystallizesTo: { persistent: true, authorable: true },
      // ⭐⭐ What a porous body strains this into — `spoiler: 1`: that fouled
      // water comes through a filter clean is the lesson, and that tainted
      // water does not is the harder one.
      filteredTo: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
      boilingPointElevation: { persistent: true, authorable: true },
      concentratesTo: { persistent: true, authorable: true },
    };

    /**
     * ⭐ **What this becomes when it is boiled** — a material template
     * path, or `''` for a material boiling does not improve.
     *
     * The actionable half of the John Snow lesson, and the second rung of
     * the counterplay ladder (*move your intake · boil · treat*). Boiling
     * is **personal and per-use**: it costs fuel and time every single
     * time, which is exactly why a town eventually pays for treatment
     * instead.
     *
     * It is an arrow between two authored materials rather than a
     * mutation, because a `Material` is a **shared reference Idea** — one
     * row backs every litre of that stuff in the world, so boiling a pot
     * by editing the material would purify every river at once. The
     * closed-material doctrine says the same thing from the other side:
     * *materials are a fixed set and blends derive*, so the way to say
     * "this water is different now" is to name a different material.
     *
     * ⚠ It says nothing about **persistent** contamination, and that
     * silence is the point: boiling a lead-fouled river gives you hot
     * lead-fouled river. A persistent contaminant's material simply
     * declares no counterpart.
     *
     * See [docs/subsystems/watershed.md].
     */
    protected purifiedByBoiling: string = '';

    /** The material this becomes when boiled, or `''`. */
    public getPurifiedByBoiling(): string {
      return this.purifiedByBoiling;
    }

    public setPurifiedByBoiling(value: string): void {
      this.purifiedByBoiling = typeof value === 'string' ? value.trim() : '';
    }

    /**
     * ⭐ Dissolved solids a fresh litre of this carries, kg/L (sugar D1):
     * maple sap 0.025, cane juice 0.16, raw liquor 0.6. `0` for everything
     * that is not a solution anyone boils down. The plateau rewrites the
     * figure on the bulk's payload as it boils water off; this is where a
     * fill with no payload figure starts.
     */
    protected solidsKgPerL = 0;

    public getSolidsKgPerL(): number {
      return this.solidsKgPerL;
    }
    public setSolidsKgPerL(value: number): void {
      this.solidsKgPerL = Number.isFinite(value) && value > 0 ? value : 0;
    }

    /**
     * The mass fraction `w` of dissolved solids at `solidsKgPerL` — the one
     * derived read the boil, its arrows and the hydrometer share. The water
     * in a litre is what the solids have not displaced.
     */
    public solidsMassFraction(solidsKgPerL: number): number {
      if (!(solidsKgPerL > 0)) return 0;
      const waterKg = Math.max(0, 1 - solidsKgPerL / SOLUTE_DENSITY_KG_PER_L);
      return solidsKgPerL / (solidsKgPerL + waterKg);
    }

    /**
     * ⭐ How far the boiling point climbs as the solution thickens (sugar
     * D1): `[[w, ΔK], …]`, `w` ascending in `[0, 1]`, read piecewise
     * linearly. Empty — water's behaviour — means no elevation.
     */
    protected boilingPointElevation: Array<[number, number]> = [];

    public getBoilingPointElevation(): ReadonlyArray<readonly [number, number]> {
      return this.boilingPointElevation;
    }
    public setBoilingPointElevation(value: Array<[number, number]> | null): void {
      if (value === null || value === undefined || value.length === 0) {
        this.boilingPointElevation = [];
        return;
      }
      let prev = -1;
      for (const pt of value) {
        if (
          !Array.isArray(pt) ||
          pt.length !== 2 ||
          !(pt[0] >= 0 && pt[0] <= 1) ||
          !(pt[0] > prev) ||
          !(Number.isFinite(pt[1]) && pt[1] >= 0)
        ) {
          throw new RangeError(
            'Material.setBoilingPointElevation: need [[w, ΔK], …] with w ascending in [0, 1] and ΔK >= 0',
          );
        }
        prev = pt[0];
      }
      this.boilingPointElevation = value.map(([w, k]) => [w, k] as [number, number]);
    }

    /**
     * The boiling point (K) at solids mass fraction `w` — the plain boil plus
     * the elevation. `0` for a solution that does not boil (no volatility).
     */
    public boilingPointAt(w: number): number {
      const self = this as unknown as Stuff;
      const base = MixinApi.hasVolatility(self) ? self.getBoilingPoint().rawValue() : 0;
      const curve = this.boilingPointElevation;
      if (curve.length === 0 || !(base > 0)) return base;
      if (w <= curve[0]![0]) return base + curve[0]![1];
      for (let i = 1; i < curve.length; i++) {
        const [w1, k1] = curve[i]!;
        if (w <= w1) {
          const [w0, k0] = curve[i - 1]!;
          return base + k0 + ((w - w0) / (w1 - w0)) * (k1 - k0);
        }
      }
      return base + curve[curve.length - 1]![1];
    }

    /**
     * ⭐ What this solution becomes as it boils down (sugar D1) — stages in
     * ascending `fromW`. The plateau fires the highest arrow the liquor has
     * reached. See {@link ConcentrationArrow}.
     */
    protected concentratesTo: ConcentrationArrow[] = [];

    public getConcentratesTo(): readonly ConcentrationArrow[] {
      return this.concentratesTo;
    }
    public setConcentratesTo(value: ConcentrationArrow[] | null): void {
      if (value === null || value === undefined || value.length === 0) {
        this.concentratesTo = [];
        return;
      }
      let prev = 0;
      for (const a of value) {
        if (
          a === null ||
          typeof a !== 'object' ||
          !(a.fromW > prev && a.fromW <= 1) ||
          typeof a.becomes !== 'string' ||
          a.becomes.trim() === '' ||
          (a.minBand !== undefined && !Grade.isBand(a.minBand)) ||
          (a.minBand === undefined) !== (a.elseBecomes === undefined) ||
          (a.elseBecomes !== undefined &&
            (typeof a.elseBecomes !== 'string' || a.elseBecomes.trim() === ''))
        ) {
          throw new RangeError(
            'Material.setConcentratesTo: need fromW ascending in (0, 1], becomes a path, minBand a grade band, and elseBecomes present iff minBand',
          );
        }
        prev = a.fromW;
      }
      this.concentratesTo = value.map((a) => ({
        fromW: a.fromW,
        becomes: a.becomes.trim(),
        ...(a.minBand ? { minBand: a.minBand, elseBecomes: a.elseBecomes!.trim() } : {}),
      }));
    }

    /**
     * ⭐ How much solute a liter of this holds at a temperature (ceramics
     * S17): `[[K, kgPerL], …]`, K ascending, read piecewise linearly and
     * held flat past either end. Salt barely cares (0.31 → 0.33 kg/L from
     * freezing to boiling) — which is why salt is made by taking the water
     * AWAY; alum and saltpetre care a great deal, which is why they are made
     * by letting a hot liquor COOL. Empty: this is not a solution anything
     * sets out of.
     */
    protected solubility: Array<[number, number]> = [];

    public getSolubility(): ReadonlyArray<readonly [number, number]> {
      return this.solubility;
    }
    public setSolubility(value: Array<[number, number]> | null): void {
      if (value === null || value === undefined) {
        this.solubility = [];
        return;
      }
      if (!Array.isArray(value)) {
        throw new TypeError('Material.solubility must be a list of [K, kgPerL] pairs');
      }
      const points = value.map((p, i) => {
        const [k, kg] = Array.isArray(p) ? p : [NaN, NaN];
        if (!(Number(k) > 0) || !(Number(kg) >= 0)) {
          throw new TypeError(`Material.solubility[${i}]: [${String(k)}, ${String(kg)}] is not [K > 0, kgPerL >= 0]`);
        }
        return [Number(k), Number(kg)] as [number, number];
      });
      for (let i = 1; i < points.length; i++) {
        if (points[i]![0] <= points[i - 1]![0]) {
          throw new TypeError('Material.solubility must be ascending in K');
        }
      }
      this.solubility = points;
    }

    /** kg of solute a liter holds at `tempK`, or `null` when unauthored. */
    public solubilityAt(tempK: number): number | null {
      const pts = this.solubility;
      if (pts.length === 0) return null;
      const first = pts[0]!;
      const last = pts[pts.length - 1]!;
      if (tempK <= first[0]) return first[1];
      if (tempK >= last[0]) return last[1];
      for (let i = 1; i < pts.length; i++) {
        const [k1, s1] = pts[i]!;
        if (tempK <= k1) {
          const [k0, s0] = pts[i - 1]!;
          return s0 + ((s1 - s0) * (tempK - k0)) / (k1 - k0);
        }
      }
      return last[1];
    }

    /** What crystallizing this solution sets and leaves, or `null`. */
    protected crystallizesTo: CrystallizesTo | null = null;

    public getCrystallizesTo(): CrystallizesTo | null {
      return this.crystallizesTo;
    }
    public setCrystallizesTo(value: CrystallizesTo | null): void {
      if (value === null || value === undefined) {
        this.crystallizesTo = null;
        return;
      }
      const product = typeof value.product === 'string' ? value.product.trim() : '';
      const residue = typeof value.residue === 'string' ? value.residue.trim() : '';
      if (product === '' || residue === '') {
        throw new TypeError('Material.crystallizesTo needs both a product and a residue path');
      }
      this.crystallizesTo = { product, residue };
    }

    /**
     * ⭐⭐ The material this becomes when it seeps through a porous body
     * (ceramics S9 — the water filter), or `''`. The pores are smaller than
     * a bacterium and larger than an ion, so fouled water (organic and
     * sediment — the dysentery is IN something) names plain water, and
     * tainted water (lead, a nitrate — dissolved) names nothing: it comes
     * through as it went in.
     */
    protected filteredTo = '';

    public getFilteredTo(): string {
      return this.filteredTo;
    }
    public setFilteredTo(value: string | null): void {
      this.filteredTo = typeof value === 'string' ? value.trim() : '';
    }
  };
}

/**
 * Density of the dissolved solids (kg/L) the mass-fraction read assumes —
 * sucrose's, and near enough for any sugar or salt a pan boils down.
 */
const SOLUTE_DENSITY_KG_PER_L = 1.6;
