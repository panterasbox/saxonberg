/**
 * WearableMixin — body-side affordance: "this Stuff can be worn on a
 * body-plan slot."
 *
 * Composes on `Stuff & Slottable + Containable` (the wearable lives in
 * inventory before being worn). Per-body-plan claim: a `slotClaims`
 * record maps a body-plan template path to the ordered list of slot
 * names this wearable claims on that body plan. A boots template
 * declares `[foot:left, foot:right]` on biped, `[hoof:fore-left, …]`
 * on quadruped.
 *
 * Multi-slot claims are atomic — `wear` either claims all slots or
 * none (transactional). The atomicity check lives in the `wear`
 * controller / `Slotted.occupyAll`; the substrate's `Slotted.occupy`
 * is single-slot.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Containable } from '../spatial/Containable';
import type { Slottable } from './Slottable';
import type { Slotted } from './Slotted';
import type BodyPlan from '../../platform/idea/species/BodyPlan';
import { SpeciesApi } from '../../api/species';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { Quantity } from '../quantity';

export interface Wearable extends Slottable {
  getSlotClaim(bodyPlanPath: string): readonly string[];
  setSlotClaim(bodyPlanPath: string, slots: string[]): void;
  getEligibleBodyPlans(): readonly string[];

  // Persistence-shape accessor pair (default Hydrator).
  getSlotClaims(): Readonly<Record<string, readonly string[]>>;
  setSlotClaims(value: Record<string, string[]>): void;

  /**
   * Thermal insulation this garment contributes when worn, in `clo`.
   *
   * ⚠⚠ **DERIVED, never authored.** The persistent field is gone. A
   * wool coat is warm because wool conducts at 0.04 W/mK and the form
   * traps air, not because somebody typed a number — and an authored
   * `clo` would silently override the whole thermal model, which is
   * exactly what it did.
   *
   * ```
   * clo   = (t / k_eff) / R_CLO            R_CLO = 0.155 m²·K/W
   * t     = mass / (density × A_covered)   effective thickness (m)
   * k_eff = k_fibre·(1 − loft) + k_air·loft
   * ```
   *
   * `loft` is the **construction form's**, so *form sets the band* is
   * not merely an ordering rule — it is a real thermal parameter: a
   * knit traps air and a plain weave does not. `A_covered` comes from
   * this garment's own `slotClaims` × the plan's per-part surface
   * fractions, so a garment states its `clo` **with no wearer**, which
   * is what the inspection card needs.
   *
   * ⭐ **Wet cloth is a different object.** Water floods the loft, and
   * the loft is where the insulation lived — so `k_air` is displaced by
   * `k_water` (23× larger) in proportion to how much water the material
   * can hold. Wet wool retains more than wet linen because
   * `waterAbsorptionCapacity` differs (33% vs 20%), not because
   * anything is special-cased.
   */
  getClo(): Quantity<'clo'>;

  /**
   * How well this garment fits `wearer` — the two derived measurements
   * against the stamp `cut` left.
   *
   * ⭐ **On the GARMENT, not the wearer.** The garment carries `cutTo`
   * and is the thing that fits or does not; the wearer is the argument.
   */
  fitOn(wearer: Stuff): FitReading;

  /** The measurements this garment was cut to (`''` plan = stock). */
  getCutTo(): FitReading['cut'];
  /** Stamp the measurements — `cut`'s job. */
  setCutTo(bodyPlanPath: string, statureM: number, girthIndex: number): void;

  // Persistence-shape accessor pairs (default Hydrator). ⚠ THREE named
  // scalars rather than one composite object: a fixed-key composite of
  // three scalars is exactly the case the persistent-fields doctrine
  // says decomposes. (`slotClaims` is the contrasting VARIABLE-key case
  // and stays a raw map.)
  getCutToBodyPlan(): string;
  setCutToBodyPlan(value: string): void;
  getCutToStature(): number;
  setCutToStature(value: number): void;
  getCutToGirth(): number;
  setCutToGirth(value: number): void;
}

/**
 * A garment measured against a body — two numbers, one distance, and a
 * signed verdict.
 *
 * ⭐ Deliberately **two numbers, not a tailor's chart**: a stature and a
 * ponderal index `girth = √(mass / stature)`. `massKg` is
 * `Creature.getMass()`, which already reflects composition and will
 * reflect lineage variance — **that is the seam, and it is one line.**
 */
export interface FitReading {
  /** The measurements the garment was cut to. */
  cut: {
    /** `''` = stock, and stock resolves to the plan's average body. */
    bodyPlanPath: string;
    statureM: number;
    girthIndex: number;
  };
  /** The wearer's own measurements. */
  body: { statureM: number; girthIndex: number };
  /** Euclidean relative distance between the two. `0` = cut for you. */
  distance: number;
  /** `0..` — how much bigger the garment is than the body. */
  looseness: number;
  /** `0..` — how much smaller the garment is than the body. */
  tightness: number;
  /**
   * ⚠ A different body plan entirely — a HARD refusal independent of
   * distance, and not redundant with `slotClaims`: a halfling and a
   * dragonborn are both `biped`, so slot matching alone would let the
   * coat on.
   */
  wrongBody: boolean;
  /** Whether the measurements resolved at all (a plan-less host). */
  measurable: boolean;
}

/** The neutral reading — a garment nobody can be measured against. */
const UNMEASURABLE: FitReading = Object.freeze({
  cut: { bodyPlanPath: '', statureM: 0, girthIndex: 0 },
  body: { statureM: 0, girthIndex: 0 },
  distance: 0,
  looseness: 0,
  tightness: 0,
  wrongBody: false,
  measurable: false,
});

/** Thermal conductivity of still air, W/(m·K). */
const K_AIR = 0.026;
/** Thermal conductivity of water, W/(m·K) — ~23× air's. */
const K_WATER = 0.6;
/** One clo, in m²·K/W. The unit's definition, not a dial. */
const R_CLO = 0.155;

/** Clo dials, with seeded-literal fallbacks (pre-warm / test safe). */
const CLO_DEFAULTS = {
  /** Reference whole-body surface area (m²) — a biped-ish adult. */
  REFERENCE_SURFACE_M2: 1.8,
  /** Surface share assumed when a garment claims no resolvable slots. */
  DEFAULT_COVERED_FRACTION: 0.3,
  /**
   * `waterAbsorptionCapacity` (% of dry mass) at which a material's
   * loft is considered fully flooded. Wool sits at 33, linen at 20.
   */
  ABSORPTION_REFERENCE: 40,
} as const;

/** Validate a non-negative finite measurement, naming the setter. */
function nonNegative(setter: string, value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `Wearable.${setter}: must be a finite, non-negative number, got ${value}`,
    );
  }
  return value;
}

/** Numeric AppSetting read, falling back to the seeded literal. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

export function WearableMixin<
  TBase extends MixinConstructor<Stuff & Slottable & Containable>
>(Base: TBase) {
  return class WearableMixin extends Base {
    static _mixinName = 'WearableMixin';
    static fieldMeta: FieldMeta = {
      slotClaims: { persistent: true, authorable: true },
      cutToBodyPlan: { persistent: true, authorable: true },
      cutToStature: { persistent: true, authorable: true },
      cutToGirth: { persistent: true, authorable: true },
    };

    /**
     * Per-body-plan slot claims. `bodyPlanPath` → ordered list of slot
     * names. Empty / absent = ineligible on that body plan.
     */
    public slotClaims: Record<string, string[]> = {};

    /**
     * The body plan this garment was cut for. `''` = **stock**, and
     * that is the load-bearing default: every shipped row carries no
     * stamp and therefore reads as an ill-fitting hand-me-down against
     * the plan's average body, with **no content edit**.
     */
    public cutToBodyPlan = '';
    /** Stature (m) the garment was cut to. */
    public cutToStature = 0;
    /** Ponderal index the garment was cut to. */
    public cutToGirth = 0;

    public getCutToBodyPlan(): string {
      return this.cutToBodyPlan;
    }
    public setCutToBodyPlan(value: string): void {
      if (typeof value !== 'string') {
        throw new TypeError('Wearable.setCutToBodyPlan: must be a string');
      }
      this.cutToBodyPlan = value;
    }
    public getCutToStature(): number {
      return this.cutToStature;
    }
    public setCutToStature(value: number): void {
      this.cutToStature = nonNegative('setCutToStature', value);
    }
    public getCutToGirth(): number {
      return this.cutToGirth;
    }
    public setCutToGirth(value: number): void {
      this.cutToGirth = nonNegative('setCutToGirth', value);
    }

    public getCutTo(): FitReading['cut'] {
      return {
        bodyPlanPath: this.cutToBodyPlan,
        statureM: this.cutToStature,
        girthIndex: this.cutToGirth,
      };
    }

    public setCutTo(
      bodyPlanPath: string,
      statureM: number,
      girthIndex: number,
    ): void {
      this.setCutToBodyPlan(bodyPlanPath);
      this.setCutToStature(statureM);
      this.setCutToGirth(girthIndex);
    }

    /**
     * Measure this garment against `wearer` — see {@link FitReading}.
     *
     * ⭐ An ABSENT stamp is not an error: it means *stock*, and stock
     * resolves to the wearer's body plan's average. So a shipped row
     * fits a near-average body passably and an unusual one badly, which
     * is exactly what off-the-rack clothing does, and it needs no
     * authored fallback.
     */
    public fitOn(wearer: Stuff): FitReading {
      if (!MixinApi.isOrganism(wearer)) return UNMEASURABLE;
      const species = wearer.getSpecies();
      const plan = species?.getBodyPlan();
      if (!species || !plan) return UNMEASURABLE;
      const planPath = plan.getTemplatePath() ?? '';

      const statureM = species.getStature();
      const massKg = MixinApi.isTangible(wearer)
        ? wearer.getMass().rawValue()
        : 0;
      if (!(statureM > 0) || !(massKg > 0)) return UNMEASURABLE;
      const girthIndex = Math.sqrt(massKg / statureM);

      // Stock: the plan's average body, which is the honest reading of
      // "cut for nobody in particular".
      const stock = this.cutToBodyPlan === '';
      const cutPlan = stock ? planPath : this.cutToBodyPlan;
      const planMass = plan.getBaseMass();
      const planStature = plan.getBaseStature();
      const cutStature = stock ? planStature : this.cutToStature;
      const cutGirth =
        stock
          ? planStature > 0 && planMass > 0
            ? Math.sqrt(planMass / planStature)
            : 0
          : this.cutToGirth;
      if (!(cutStature > 0) || !(cutGirth > 0)) return UNMEASURABLE;

      const dStature = (statureM - cutStature) / cutStature;
      const dGirth = (girthIndex - cutGirth) / cutGirth;
      const distance = Math.hypot(dStature, dGirth);
      // Signed: the garment is LOOSE when it was cut for a bigger body.
      const signed = (dStature + dGirth) / 2;

      return {
        cut: {
          bodyPlanPath: cutPlan,
          statureM: cutStature,
          girthIndex: cutGirth,
        },
        body: { statureM, girthIndex },
        distance,
        looseness: signed < 0 ? -signed : 0,
        tightness: signed > 0 ? signed : 0,
        wrongBody: !stock && cutPlan !== planPath,
        measurable: true,
      };
    }

    /**
     * Derive this garment's insulation from physics — see the interface
     * docstring for the arithmetic. Returns `0 clo` whenever a term is
     * missing (no material, no mass, no density): an unmodelled garment
     * insulates nothing, which is honest rather than a guess.
     */
    public getClo(): Quantity<'clo'> {
      const self = this as unknown as Stuff;
      if (!MixinApi.isTangible(self)) return Quantity.of(0, 'clo');
      const material = self.getMaterial();
      if (!material) return Quantity.of(0, 'clo');

      const density = material.getDensity().rawValue();
      if (!(density > 0)) return Quantity.of(0, 'clo');

      // ⚠ `getMass()` is already wetness-aware (Tangible), so a soaked
      // garment is heavier here — thicker, which alone would make it
      // WARMER. The flooded loft below is what actually decides, and it
      // dominates: water conducts 23× better than the air it displaced.
      const massKg = self.getMass().rawValue();
      if (!(massKg > 0)) return Quantity.of(0, 'clo');

      const area = this.coveredAreaM2();
      if (!(area > 0)) return Quantity.of(0, 'clo');

      const thickness = massKg / (density * area);

      const form = MixinApi.isConstructed(self)
        ? self.getConstruction()
        : null;
      const loft = form?.getFabric()?.loft ?? 0;
      const kFibre = material.getThermalConductivity().rawValue();

      // How much of the loft is water rather than air.
      const wetness = MixinApi.isWet(self) ? self.getWetness() : 0;
      const capacity = material.getWaterAbsorptionCapacity().rawValue();
      const soak =
        wetness *
        Math.min(
          1,
          capacity /
            dial(
              AppSettingKeys.textilesCloAbsorptionReference,
              CLO_DEFAULTS.ABSORPTION_REFERENCE,
            ),
        );
      const kVoid = K_AIR * (1 - soak) + K_WATER * soak;
      const kEff = kFibre * (1 - loft) + kVoid * loft;
      if (!(kEff > 0)) return Quantity.of(0, 'clo');

      return Quantity.of(thickness / kEff / R_CLO, 'clo');
    }

    /**
     * The body surface this garment covers, in m² — its own
     * `slotClaims` resolved against a body plan's per-part surface
     * fractions.
     *
     * ⭐ Deliberately **wearer-free**: a garment states its insulation
     * on a shop shelf, which is what the inspection card needs. It uses
     * the first body plan it declares a claim for; a garment claiming
     * nothing resolvable falls back to a dialed share.
     */
    protected coveredAreaM2(): number {
      const surface = dial(
        AppSettingKeys.textilesCloReferenceSurfaceM2,
        CLO_DEFAULTS.REFERENCE_SURFACE_M2,
      );
      const fallback =
        surface *
        dial(
          AppSettingKeys.textilesCloDefaultCoveredFraction,
          CLO_DEFAULTS.DEFAULT_COVERED_FRACTION,
        );
      const planPath = Object.keys(this.slotClaims)[0];
      if (!planPath) return fallback;
      const plan = StuffApi.findByTemplatePath<BodyPlan>(planPath);
      if (!plan) return fallback;
      const parts = new Set<string>();
      for (const slotName of this.slotClaims[planPath] ?? []) {
        const spec = plan.getSlots().find((s) => s.name === slotName);
        for (const part of spec?.covers ?? []) parts.add(part);
      }
      let fraction = 0;
      for (const part of parts) fraction += plan.getPartSurfaceFraction(part);
      return fraction > 0 ? surface * fraction : fallback;
    }

    public getSlotClaims(): Readonly<Record<string, readonly string[]>> {
      return this.slotClaims;
    }

    public setSlotClaims(value: Record<string, string[]>): void {
      this.slotClaims = value;
    }

    public getSlotClaim(bodyPlanPath: string): readonly string[] {
      return this.slotClaims[bodyPlanPath] ?? [];
    }

    public setSlotClaim(bodyPlanPath: string, slots: string[]): void {
      this.slotClaims[bodyPlanPath] = slots;
    }

    public getEligibleBodyPlans(): readonly string[] {
      return Object.keys(this.slotClaims);
    }

    public fitsSlot(host: Stuff & Slotted, slot: string): boolean {
      const bodyPlanPath = SpeciesApi.tryGetBodyPlanPath(host);
      if (!bodyPlanPath) return false;
      return this.getSlotClaim(bodyPlanPath).includes(slot);
    }
  };
}
