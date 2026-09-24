/**
 * ComminutingMixin — **reduce matter, then separate it.** The grinding
 * primitive: a `Tooled` Thing that takes a quantity of something in and
 * yields a finer PRODUCT plus a coarser RESIDUE.
 *
 * ⭐ The vocabulary is deliberately `product` / `residue` and never
 * `flour` / `bran`, because a grist mill is not the only thing that does
 * this. A stamp mill takes ore and yields concentrate plus tailings on
 * the same three fields; that second consumer lives in a different pack
 * with no ancestor in common, which is the test for kernel substrate.
 *
 * ## The two decisions it models
 *
 * **1. Extraction (`e`)** — how much of the input you keep as product.
 * Grind fine and take everything and you keep the coarse outer matter
 * with it; take less and what you keep is the pure inner stock. This is
 * the miller's decision, made per grind, and the ONE thing the whole
 * mixin exists to make a real choice:
 *
 * ```
 *   productKg = kg * e            residueKg = kg * (1 - e)
 *   branShare = max(0, e - (1 - b)) / e     b = residueFraction
 * ```
 *
 * ⭐⭐ `branShare` is what makes this honest. Below `1 - b` the product is
 * pure inner stock and the bolting throws all the outer away; above it
 * you are keeping outer matter, continuously, in proportion. There is no
 * band and no ladder — **0.61 and 0.62 produce different matter**, which
 * is the whole point: a band ladder would make two settings identical and
 * turn a decision into a menu.
 *
 * The product's payload carries that as a `composition` (inner part +
 * outer part) and a `water.moisture`, so the nutrition label, the tags and
 * the keeping all move continuously with `e` through machinery that
 * already existed. **No material row per band.**
 *
 * **2. The toll** — a fraction of the product stays with the mill. The
 * multure: payment in kind rather than coin, which is how a mill pays for
 * its premises with no banking code and no new service vocabulary.
 *
 * ## What this mixin is NOT
 *
 * ⚠ It does not know about water, wheels or power. `availablePowerW()`
 * answers 0 here; a pack that has a river overrides it. The kernel does
 * not import the water pack, and this is the seam that keeps it honest.
 *
 * See [docs/subsystems/crafting.md].
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { BlendPart } from '../bulk/Bulkable';
import type { WaterState } from '../material/WaterActivity';
import { Grade } from './Grade';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import type Material from '../material/Material';

/** Comminution defaults — playtest numbers, not decisions. */
const COMMINUTION_DEFAULTS = {
  /** Kilograms in one nutrition "serving" — the composition's unit. */
  SERVING_KG: 0.1,
  /** Density (kg/m3) assumed for matter whose Material tabulates none. */
  DEFAULT_DENSITY: 600,
  /** The product's moisture at pure-inner extraction (the driest case). */
  MOISTURE_FLOOR: 0.91,
  /** How much moisture full-outer product adds over the floor. */
  MOISTURE_SPAN: 0.09,
} as const;

/** What one grind will produce — pure arithmetic, nothing mutated. */
export interface ComminutionPlan {
  /** Extraction actually used, after clamping to the instrument's range. */
  extraction: number;
  /** Kilograms of product. */
  productKg: number;
  /** Litres of product, by the product material's density. */
  productL: number;
  /** Kilograms of residue. */
  residueKg: number;
  /** Litres of residue. */
  residueL: number;
  /** Kilograms of product withheld as the mill's toll (in kind). */
  tollKg: number;
  /** Litres of that toll. */
  tollL: number;
  /**
   * The share of the product that is outer matter `[0, 1]` — continuous
   * in `extraction`, and the number every derived reading comes from.
   */
  outerShare: number;
  /** The product payload's composition (inner part + outer part). */
  composition: BlendPart[];
  /** The product payload's water state — wetter as the outer share rises. */
  water: WaterState;
  /** Grade of the product: weakest link of the input and the instrument. */
  grade: Grade;
  /** Template path of the product material. */
  productMaterial: string;
  /** Template path of the residue material. */
  residueMaterial: string;
}

/** What a grind is asked to work on. */
export interface ComminutionInput {
  /** Kilograms going in. */
  kg: number;
  /** The input matter's Material path (for the product's inner part). */
  materialPath: string;
  /** The input's grade band word; empty = ungraded, derives at `fair`. */
  gradeBand: string;
}

/** The comminution capability surface. */
export interface Comminuting {
  /** Plan a grind — pure; nothing is mutated and nothing is minted. */
  planComminution(input: ComminutionInput, extraction?: number): ComminutionPlan;
  /** Game-milliseconds a grind of `kg` takes at the current power. */
  grindMs(kg: number): number;
  /** Throughput (kg per game-minute) at the current power; 0 = cannot. */
  throughputNow(): number;
  /**
   * Mechanical power (W) available to this instrument. **0 on the kernel
   * mixin** — the power read belongs to whatever pack has a river.
   */
  availablePowerW(): number;
  /**
   * Bring the power read UP TO DATE before a sync read of it. A pack's
   * read may be a cached figure refreshed asynchronously (a water mill
   * reads a river that is memoised per six game-hours), and the FIRST
   * read of a cold cache answers 0 — which the verb would then report
   * as "nothing is driving it", a lie. No-op on the kernel mixin.
   */
  settlePower(): Promise<void>;
  /** Is a grind running right now? (Runtime only; a reload wakes idle.) */
  isGrinding(): boolean;
  setGrinding(value: boolean): void;

  // Public so the Hydrator can reflect into them.
  throughputKgPerMin: number;
  kgPerMinPerKw: number;
  maxThroughputKgPerMin: number;
  extractionMin: number;
  extractionMax: number;
  extractionDefault: number;
  residueFraction: number;
  productMaterial: string;
  residueMaterial: string;
  productVessel: string;
  residueVessel: string;
  tollFraction: number;
  tollBinPath: string;
}

export function ComminutingMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class ComminutingMixin extends Base implements Comminuting {
    static _mixinName: string = 'ComminutingMixin';

    static fieldMeta: FieldMeta = {
      throughputKgPerMin: { persistent: true, authorable: true },
      kgPerMinPerKw: { persistent: true, authorable: true },
      maxThroughputKgPerMin: { persistent: true, authorable: true },
      extractionMin: { persistent: true, authorable: true },
      extractionMax: { persistent: true, authorable: true },
      extractionDefault: { persistent: true, authorable: true },
      residueFraction: { persistent: true, authorable: true },
      productMaterial: { persistent: true, authorable: true },
      residueMaterial: { persistent: true, authorable: true },
      productVessel: { persistent: true, authorable: true },
      residueVessel: { persistent: true, authorable: true },
      tollFraction: { persistent: true, authorable: true },
      tollBinPath: { persistent: true, authorable: true },
    };

    /** Kilograms per game-minute with no power at all — the hand rung. */
    public throughputKgPerMin = 0;
    /** Kilograms per game-minute per kilowatt; 0 = this cannot be driven. */
    public kgPerMinPerKw = 0;
    /** Ceiling on throughput however much power arrives; 0 = none. */
    public maxThroughputKgPerMin = 0;

    /** The narrowest extraction this instrument can bolt to. */
    public extractionMin = 0.55;
    /** The widest — 1 is "keep everything, bolt nothing". */
    public extractionMax = 1;
    /** What a grind that names no extraction uses. */
    public extractionDefault = 0.75;

    /**
     * ⭐ **The bolting's `b`** — the fraction of the input that is outer
     * matter this instrument's cloth can separate. It is a property of
     * the SCREEN, not of the grain: the cloth decides what counts as
     * bran, which is why it lives here and not on the Material.
     */
    public residueFraction = 0.25;

    /** Template paths of the two outputs' matter and their vessels. */
    public productMaterial = '';
    public residueMaterial = '';
    public productVessel = '';
    public residueVessel = '';

    /** The multure: product withheld in kind. 0 = no toll (a hand quern). */
    public tollFraction = 0;
    /** Where the toll goes; empty = nowhere, and the toll is not taken. */
    public tollBinPath = '';

    /**
     * ⚠ Runtime only, never persisted. A reload wakes the mill idle — the
     * `ManualBuild` rule: an engagement does not survive a restart, so a
     * flag claiming one did would strand the instrument forever.
     */
    private _grinding = false;

    public isGrinding(): boolean {
      return this._grinding;
    }
    public setGrinding(value: boolean): void {
      this._grinding = value === true;
    }

    public availablePowerW(): number {
      return 0;
    }

    public async settlePower(): Promise<void> {
      /* the kernel mixin has no power to settle */
    }

    public throughputNow(): number {
      const hand = this.throughputKgPerMin;
      if (this.kgPerMinPerKw <= 0) return hand;
      const kw = this.availablePowerW() / 1000;
      const driven = hand + kw * this.kgPerMinPerKw;
      return this.maxThroughputKgPerMin > 0
        ? Math.min(driven, this.maxThroughputKgPerMin)
        : driven;
    }

    public grindMs(kg: number): number {
      const rate = this.throughputNow();
      if (!(rate > 0) || !(kg > 0)) return 0;
      // Game-minutes to game-milliseconds; the caller converts to real
      // time at the clock's scale.
      return (kg / rate) * 60 * 1000;
    }

    public planComminution(
      input: ComminutionInput,
      extraction?: number,
    ): ComminutionPlan {
      const e = clamp(
        extraction ?? this.extractionDefault,
        this.extractionMin,
        this.extractionMax,
      );
      const kg = input.kg > 0 ? input.kg : 0;
      const productKg = kg * e;
      const residueKg = kg - productKg;
      const tollKg = this.tollBinPath ? productKg * clamp(this.tollFraction, 0, 1) : 0;

      // ⭐⭐ The continuous part. `b` of the input is outer matter. Below
      // an extraction of `1 - b` the bolting throws all of it away and
      // what you keep is pure inner stock; above it you are necessarily
      // keeping outer matter, in exactly the proportion by which you
      // overshot. No bands, no ladder — every extraction is its own
      // answer, which is what makes it a decision instead of a menu.
      const b = clamp(this.residueFraction, 0, 1);
      const outerShare = e > 0 ? Math.max(0, e - (1 - b)) / e : 0;

      const composition: BlendPart[] = [];
      const servings = productKg / COMMINUTION_DEFAULTS.SERVING_KG;
      if (servings > 0) {
        if (this.productMaterial) {
          composition.push({
            materialPath: this.productMaterial,
            servings: servings * (1 - outerShare),
          });
        }
        if (this.residueMaterial && outerShare > 0) {
          composition.push({
            materialPath: this.residueMaterial,
            servings: servings * outerShare,
          });
        }
      }

      // ⭐ Keeping, through the shipped per-instance water state rather
      // than a keeping flag: the outer matter carries the oil and the
      // water, so a wholemeal product sits at its material's full water
      // activity and a pure-inner one sits below the growth floor.
      // `Freshness.waterActivityOf = base * moisture * (1 - solute)`.
      const D = COMMINUTION_DEFAULTS;
      const water: WaterState = {
        moisture:
          D.MOISTURE_FLOOR +
          D.MOISTURE_SPAN * (b > 0 ? Math.min(1, outerShare / b) : 0),
        solute: 0,
      };

      // Weakest link, then floored by this instrument's own control — the
      // shipped `applyControlFloor` convention: capital raises the floor
      // and never the ceiling. A fine mill cannot make poor grain good.
      let grade = Grade.of(
        input.gradeBand && Grade.isBand(input.gradeBand)
          ? input.gradeBand
          : 'fair',
      );
      const self = this as unknown as Stuff;
      if (MixinApi.isTool(self)) {
        const band = self.capabilityControl('millstone');
        if (band && Grade.isBand(band)) grade = grade.max(Grade.of(band));
      }

      return {
        extraction: e,
        productKg,
        productL: litresOf(productKg, this.productMaterial),
        residueKg,
        residueL: litresOf(residueKg, this.residueMaterial),
        tollKg,
        tollL: litresOf(tollKg, this.productMaterial),
        outerShare,
        composition,
        water,
        grade,
        productMaterial: this.productMaterial,
        residueMaterial: this.residueMaterial,
      };
    }
  };
}

function clamp(x: number, lo: number, hi: number): number {
  if (!Number.isFinite(x)) return lo;
  return x < lo ? lo : x > hi ? hi : x;
}

/** Litres that `kg` of a material occupies, by its tabulated density. */
function litresOf(kg: number, materialPath: string): number {
  if (!(kg > 0)) return 0;
  const mat = materialPath
    ? StuffApi.findByTemplatePath<Material>(materialPath)
    : null;
  const density =
    (mat as unknown as Material | null)?.getDensity().rawValue() ??
    COMMINUTION_DEFAULTS.DEFAULT_DENSITY;
  return kg / ((density > 0 ? density : COMMINUTION_DEFAULTS.DEFAULT_DENSITY) / 1000);
}
