/**
 * BodyPlanSlotsMixin — sibling provider that overrides Slotted's
 * universe surface to derive from the host's species → bodyPlan.
 *
 * Pattern B from slot.md. Avatars and NPCs (anything composing
 * `OrganismMixin` + `SlottedMixin`) compose this so their slot
 * universe is the BodyPlan's `slots` array, not their own
 * `staticSlots`.
 *
 * Composition constraint: composes on `Stuff & Slotted & Organism`.
 * The order in the mixin chain matters — `BodyPlanSlotsMixin` must
 * sit ABOVE `SlottedMixin` so its overrides shadow the defaults.
 *
 * **Public surface.** The mixin adds NO new methods — it overrides
 * `getSlotNames` / `getSlotSpec` from `Slotted` and re-routes them
 * through `species → bodyPlan → slots`. Consumers that hold a
 * `Stuff & Slotted` reference get the body-plan-driven universe
 * without any branch on their side. The exported `BodyPlanSlots`
 * marker interface lets `MixinApi.hasMixin(host, 'BodyPlanSlotsMixin')`
 * narrow callers that need to distinguish body-plan-driven hosts
 * (e.g. authoring tools listing "Stuffs whose slot universe is
 * derived from anatomy"). v1 has no such caller; the interface
 * exists for the symmetry-with-other-mixins reason raised in
 * MR review.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Organism } from '../species/Organism';
import type { Slotted, SlotSpec } from './Slotted';

/**
 * Marker interface — adds no new methods over `Slotted`. Present so
 * type-narrowing predicates work symmetrically with the other slot
 * mixins (`Wearable`, `Wieldable`, `Postured`, …).
 */
export type BodyPlanSlots = Slotted;

export function BodyPlanSlotsMixin<TBase extends MixinConstructor>(
  Base: TBase
) {
  return class BodyPlanSlotsMixin extends Base {
    static _mixinName = 'BodyPlanSlotsMixin';

    getSlotNames(this: Stuff & Slotted & Organism): readonly string[] {
      const species = this.getSpecies();
      const plan = species?.getBodyPlan();
      if (!plan) return [];
      return plan.getSlots().map((s: SlotSpec) => s.name);
    }

    getSlotSpec(
      this: Stuff & Slotted & Organism,
      name: string
    ): SlotSpec | null {
      const species = this.getSpecies();
      const plan = species?.getBodyPlan();
      if (!plan) return null;
      return plan.getSlots().find((s: SlotSpec) => s.name === name) ?? null;
    }
  };
}
