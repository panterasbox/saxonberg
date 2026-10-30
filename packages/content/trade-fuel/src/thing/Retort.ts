/**
 * Retort — ⭐⭐ **the clamp's capitalised sibling, and the moment the
 * fuel trade stops throwing half of its feedstock away.**
 *
 * A clamp chars wood by starving a fire of air: what it keeps is the
 * carbon, and everything the wood gives off — tar, pitch, wood spirit,
 * a gas that burns — goes out of the vents and into the sky. That is
 * what *destructive distillation* fixes, and the whole fix is a closed
 * chamber with a pipe out of it: cook the charge, catch what leaves.
 *
 * ⭐ The fiction follows the history exactly. Coal tar was the waste of
 * the gasworks before it was the feedstock organic chemistry was built
 * on; a retort is the first object in the game whose BY-PRODUCT is worth
 * more than its product.
 *
 * **Composition.** `Container(Placing(Firebox))`, and both halves earn
 * their line:
 *
 *  - the **Container** is the chamber, which holds the charge — the same
 *    reason an `Oven` is one and a `Forge` is not;
 *  - the **Placing** is the head, which seats the receiver. A condenser
 *    stands ON the retort; the platform's `fire` verb finds the recipe,
 *    and this class hands it what leaves.
 *
 * ⚠ **The chamber routes the volatiles; the recipe only says what they
 * ARE.** It answers the kernel's `Burner.receiveVolatiles` hook with what
 * its receivers took; what they did not take the thermal transition puts
 * into the room, which is why firing a retort with no condenser makes the
 * air go bad — and is the lesson rather than a defect.
 *
 * ⭐ It affords nothing new. `fire`, `stoke`, `draught`, `cover`,
 * `ignite` and `douse` all reach it through `BurnerMixin`.
 */

import Firebox from '@saxonberg/server/mud/lib/fire/Firebox';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { PlacingMixin } from '@saxonberg/server/mud/lib/spatial/Placing';
import { AssembledMixin } from '@saxonberg/server/mud/lib/craft/Assembled';
import { DurableMixin } from '@saxonberg/server/mud/lib/material/Durable';

// ⭐ Made of parts (ceramics D19): its lining wears with every charge.
const RetortBase = AssembledMixin(DurableMixin(ContainerMixin(PlacingMixin(Firebox))));

/** What a receiver placed on the head answers to. */
interface VolatileReceiver {
  receive(materialPath: string, litres: number): number;
}

export default class Retort extends RetortBase {
  /**
   * ⭐⭐ Hand what left the charge to whatever is standing on the head —
   * and, failing that, to the air.
   *
   * The order is the physics: a receiver takes what it can condense, and
   * what it cannot (or what nothing is there to take) is in the room
   * now. ⚠ Deliberately NOT a refusal: a retort fired open does work, it
   * just does it into your lungs, and a player who leaves the condenser
   * off should find that out by measuring the air rather than by being
   * told they cannot fire the thing.
   */
  public override receiveVolatiles(materialPath: string, litres: number): number {
    if (!(litres > 0)) return 0;
    let left = litres;
    for (const placed of this.getPlaced()) {
      const receiver = placed as unknown as Partial<VolatileReceiver>;
      if (typeof receiver.receive !== 'function') continue;
      const taken = receiver.receive(materialPath, left);
      left -= taken > 0 ? taken : 0;
      if (!(left > 0)) break;
    }
    // What nothing on the head took is the room's — the kernel routes it.
    return litres - Math.max(0, left);
  }
}
