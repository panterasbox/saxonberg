/**
 * ManaCell — **a bottled charge you can carry, and the reason the
 * device category is not a terminal feature.**
 *
 * `Slottable + Charged` and nothing more (requirements D6 is explicit
 * that it is NOT a new mixin): a cell IS a charged shell, exactly like a
 * wand, differing only in that it fits a bay instead of a hand. A
 * device with a `battery` slot takes one and draws from it; a spent one
 * comes back out with `get`.
 *
 * ⭐ It is `Circulating`, so distribution and the general store carry
 * it, and it has a recipe — **where a charged cell comes from is
 * deliberately a recipe and a price, not an economy.** The mana economy
 * behind it is somebody else's build; what this build needs is that a
 * traveller at a frontier post can buy one.
 *
 * `fitsSlot` narrows to the `battery` bay. That matters because the
 * kernel's `SlotSpec.accepts` may only name a value from the KERNEL's
 * `Mixins` registry — a pack cannot invent one — so the bay accepts
 * `ChargedMixin` (which a wand also satisfies) and the candidate side
 * does the narrowing. Anything else fails `validateSlotSpecs` at
 * hydrate, which is the lint.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { ReservedMixin } from '@saxonberg/server/mud/lib/reserve';
import { ChargedMixin } from '@saxonberg/server/mud/lib/magic/Charged';
import { CirculatingMixin } from '@saxonberg/server/mud/lib/residency/Circulating';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import { SlottableMixin } from '@saxonberg/server/mud/lib/slot/Slottable';
import type { Slotted } from '@saxonberg/server/mud/lib/slot/Slotted';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { BATTERY_SLOT } from '../lib/ManaPowered';

const ManaCellBase = CirculatingMixin(
  SlottableMixin(DetailedMixin(ChargedMixin(ReservedMixin(Thing)))),
);

export default class ManaCell extends ManaCellBase {
  /**
   * A cell goes in a bay and nowhere else. The bay's `accepts` is the
   * kernel's `ChargedMixin`, so without this a wand would seat in a
   * terminal — true of the type and absurd of the world.
   */
  override fitsSlot(_host: Stuff & Slotted, slot: string): boolean {
    return slot === BATTERY_SLOT;
  }

  override getShortDescription(): string {
    return super.getShortDescription() || 'a mana cell';
  }

  /**
   * ⭐ **A cell reads its own charge, and that is not a gauge.** You can
   * tell a full one from a spent one by holding it — the charge is a
   * physical property of the object in your hand, not a number the
   * engine is telling you about somebody else's state. Bands, not a
   * percentage: the precision you get is the precision a hand gets.
   */
  override getLongDescription(): string {
    const flavor =
      this.longDescription && this.longDescription.length > 0
        ? this.longDescription
        : 'A palm-sized cell of wound brass and grey glass, warm at one end.';
    const f = this.getChargeFraction();
    const weight =
      f <= 0
        ? 'It is inert — dead weight, and colder than the room.'
        : f < 0.25
          ? 'It is nearly spent: the glass holds only a dull ember.'
          : f < 0.75
            ? 'It carries a steady light, and a faint warmth.'
            : 'It is full to the brim, and the glass is hard to look at.';
    return `${flavor}\n${weight}`;
  }

  override getLong(): string {
    return this.getLongDescription();
  }
}
