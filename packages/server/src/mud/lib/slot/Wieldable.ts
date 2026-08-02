/**
 * WieldableMixin — body-side affordance: "this Stuff can be held in a
 * body-plan held position."
 *
 * Same shape as `WearableMixin`. A longbow declares
 * `[hand:left, hand:right]` on biped (two slots → two-handed). The
 * framework doesn't model "handedness" explicitly; it's just multi-
 * slot claims through `slotClaims`.
 *
 * Composes on `Stuff & Slottable + Containable` (the wieldable lives
 * in inventory before being wielded).
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Containable } from '../spatial/Containable';
import type { CommandContributions } from '../../api/command';
import type { Slottable } from './Slottable';
import type { Slotted } from './Slotted';
import { SpeciesApi } from '../../api/species';

export interface Wieldable extends Slottable {
  getSlotClaim(bodyPlanPath: string): readonly string[];
  setSlotClaim(bodyPlanPath: string, slots: string[]): void;
  getEligibleBodyPlans(): readonly string[];

  getSlotClaims(): Readonly<Record<string, readonly string[]>>;
  setSlotClaims(value: Record<string, string[]>): void;
}

export function WieldableMixin<
  TBase extends MixinConstructor<Stuff & Slottable & Containable>
>(Base: TBase) {
  return class WieldableMixin extends Base {
    static _mixinName = 'WieldableMixin';
    static fieldMeta: FieldMeta = {
      slotClaims: { persistent: true },
    };

    /**
     * A wieldable in inventory affords `wield`; once in hand it affords
     * `unwield` (the `get`/`drop` precedent on `ContainerMixin`). The
     * verbs shipped with the "Weapon is holdable" build; combat is the
     * consumer that wires the affordance so you can actually arm
     * yourself (a prerequisite for the melee gambits).
     */
    static commandContributions: CommandContributions = {
      self: [],
      environment: [],
      inventory: ['inventory/wield.yaml', 'inventory/unwield.yaml'],
      peers: [],
    };

    /** @authorable */
    public slotClaims: Record<string, string[]> = {};

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
