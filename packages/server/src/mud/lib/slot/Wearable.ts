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
}

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
    };

    /**
     * Per-body-plan slot claims. `bodyPlanPath` → ordered list of slot
     * names. Empty / absent = ineligible on that body plan.
     */
    public slotClaims: Record<string, string[]> = {};

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
