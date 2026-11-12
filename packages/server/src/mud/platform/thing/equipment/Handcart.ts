/**
 * Handcart — a wheeled `Vessel` you hitch and pull. The worked example of
 * the haulage substrate: a container-object (holds cargo, carries its own
 * frame mass — both from `Vessel`) that is also `Haulable` (it can be
 * hitched and dragged, paying its `draftFactor`-attenuated draft load on
 * the hauler's encumbrance rather than its full cargo weight).
 *
 * Natural sibling of `Pack` in the `equipment` subsystem: a Pack is a
 * wearable `Vessel` (load stays on your body, couples at the worn floor);
 * a Handcart is a *dragged* `Vessel` (load leaves your body onto the
 * wheels — `carry / drag / cart / can't-budge` emergent from
 * `draftFactor × mass` vs. capacity). Variety (a heavy wagon, a light
 * barrow, a dragged sledge with a high draftFactor) is content +
 * data, not subclassing.
 *
 * Seeded as `domain` content (e.g. `/stuff/thing/gear/handcart`) with
 * `data.draftFactor` / `data.handedness` / `data.mass`.
 */

import { Vessel } from '../../../lib/stuff/Vessel';
import { HaulableMixin } from '../../../lib/slot/Haulable';
import { SealableMixin } from '../../../lib/spatial/Sealable';
import { SlottedMixin } from '../../../lib/slot/Slotted';
import { PosturedMixin } from '../../../lib/slot/Postured';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { VetoResult } from '../../../lib/errors';

// ⭐ Size and carrying W6:
//  - `Postured(Slotted(…))` — riding in a cart is SITTING in it (D38): the
//    row's `bed` slot (`postures: [sit, lie]`, a capacity) is a seat like a
//    bench's, so the shipped `sit in cart` / `lie in cart` / `stand` work.
//  - `Sealable` — a tarpaulin drawn over the load closes its top (D24/D27:
//    a shut, opaque holder hides what is in it). It starts OPEN and closes
//    only under a cover lying in it (`Haulable.coverFor`).
const HandcartBase = HaulableMixin(
  PosturedMixin(SlottedMixin(SealableMixin(Vessel))),
);

export default class Handcart extends HandcartBase {
  constructor() {
    super();
    this.setOpen(true);
  }

  /** A cart closes under a tarpaulin, and a tarp drapes over what stands up. */
  public override canClose(_by: Stuff): VetoResult {
    if (this.coverFor() !== null) return { ok: true };
    return {
      ok: false,
      reason: `There is nothing to draw over ${this.getPresentation()} — put a tarpaulin in it first.`,
    };
  }
}
