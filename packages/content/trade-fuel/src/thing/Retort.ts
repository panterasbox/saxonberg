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
 * ARE.** `FireController` probes the chamber for `receiveVolatiles` (a
 * structural probe, the `analyze water` shape-not-mixin rule) because
 * the platform must not name a trade's receiver. A chamber with no
 * receiver emits into the room, which is why firing a retort with no
 * condenser makes the air go bad — and is the lesson rather than a
 * defect.
 *
 * ⭐ It affords nothing new. `fire`, `stoke`, `draught`, `cover`,
 * `ignite` and `douse` all reach it through `BurnerMixin`.
 */

import Firebox from '@saxonberg/server/mud/lib/fire/Firebox';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { PlacingMixin } from '@saxonberg/server/mud/lib/spatial/Placing';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Atmospheric } from '@saxonberg/server/mud/lib/biome/Atmospheric';

const RetortBase = ContainerMixin(PlacingMixin(Firebox));

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
  public receiveVolatiles(materialPath: string, litres: number): void {
    if (!(litres > 0)) return;
    let left = litres;
    for (const placed of this.getPlaced()) {
      const receiver = placed as unknown as Partial<VolatileReceiver>;
      if (typeof receiver.receive !== 'function') continue;
      const taken = receiver.receive(materialPath, left);
      left -= taken > 0 ? taken : 0;
      if (!(left > 0)) return;
    }
    emitIntoScope(this as unknown as Stuff, materialPath, left);
  }
}

/**
 * Put `litres` into the air of the place this stands in — the outward
 * walk to the first `Atmospheric` ancestor with a volume, the same one a
 * fire's exhaust takes.
 */
function emitIntoScope(from: Stuff, materialPath: string, litres: number): void {
  if (!(litres > 0)) return;
  let at: Stuff | null = from;
  let depth = 32;
  while (at !== null && depth-- > 0) {
    if (
      MixinApi.isAtmospheric(at) &&
      MixinApi.isContainer(at) &&
      (at as unknown as Atmospheric).getVolume() !== null
    ) {
      (at as unknown as Atmospheric).addAtmosphereContent(materialPath, litres);
      return;
    }
    at = MixinApi.isContainable(at) ? at.getContainer() : null;
  }
}
