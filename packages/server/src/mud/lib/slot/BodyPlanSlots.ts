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
 * without any branch on their side.
 *
 * The exported `BodyPlanSlots` type is a `Slotted` alias kept for
 * symmetry with the other slot-family mixin interfaces (`Wearable`,
 * `Wieldable`, `Postured`, …). v1 has no caller that needs to
 * type-narrow on "this host's slots come from a body plan" — if
 * that arrives, register `BodyPlanSlots: 'BodyPlanSlotsMixin'` in
 * `Mixins` and add a `MixinApi.isBodyPlanSlots` predicate.
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
