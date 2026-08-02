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
 * controller / `SlotApi.occupyAll`; the substrate's `Slotted.occupy`
 * is single-slot.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Containable } from '../spatial/Containable';
import type { Slottable } from './Slottable';
import type { Slotted } from './Slotted';
import { SpeciesApi } from '../../api/species';
import { Quantity } from '../quantity';
import { QuantityMarshaller } from '../persistence/QuantityMarshaller';

export interface Wearable extends Slottable {
  getSlotClaim(bodyPlanPath: string): readonly string[];
  setSlotClaim(bodyPlanPath: string, slots: string[]): void;
  getEligibleBodyPlans(): readonly string[];

  // Persistence-shape accessor pair (default Hydrator).
  getSlotClaims(): Readonly<Record<string, readonly string[]>>;
  setSlotClaims(value: Record<string, string[]>): void;

  /**
   * Thermal insulation this garment contributes (the `clo` unit) when
   * worn. Default `0` — a bare garment insulates nothing; a parka
   * authors ~4. Summed body-wide by the Phase-2 thermoregulation layer's
   * worn-slot walk and folded into effective ambient (widening the
   * comfort band downward, shrinking fuel spend in the cold). Surface-
   * weighted per-region coverage is a deferred fidelity tier — v1 is a
   * simple additive sum.
   */
  getClo(): Quantity<'clo'>;
  setClo(value: Quantity<'clo'>): void;
}

export function WearableMixin<
  TBase extends MixinConstructor<Stuff & Slottable & Containable>
>(Base: TBase) {
  return class WearableMixin extends Base {
    static _mixinName = 'WearableMixin';
    static fieldMeta: FieldMeta = {
      slotClaims: { persistent: true, authorable: true },
      clo: { persistent: true, marshaller: QuantityMarshaller.pathFor('clo'), authorable: true },
    };

    /**
     * Per-body-plan slot claims. `bodyPlanPath` → ordered list of slot
     * names. Empty / absent = ineligible on that body plan.
     */
    public slotClaims: Record<string, string[]> = {};

    /**
     * Thermal insulation contributed when worn (default 0 clo).
     */
    public clo: Quantity<'clo'> = Quantity.of(0, 'clo');

    public getClo(): Quantity<'clo'> {
      return this.clo;
    }
    public setClo(value: Quantity<'clo'>): void {
      if (!(value instanceof Quantity) || value.unit !== 'clo') {
        throw new TypeError(
          `WearableMixin.setClo must be a Quantity<'clo'>; got ${
            value instanceof Quantity ? `Quantity<'${value.unit}'>` : typeof value
          }`,
        );
      }
      this.clo = value;
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
