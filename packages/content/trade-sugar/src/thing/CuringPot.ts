/**
 * The curing pot — ⭐ the vessel a sugar cone stands ON, catching the
 * molasses as the loaf sets (sugar D16). A `Vat` that offers a placement:
 * `put cone on pot` is the whole of the arrangement, and the kernel's
 * mould credits the pot as it drains.
 */

import Vat from '@saxonberg/server/mud/platform/thing/Vat';
import { PlacingMixin } from '@saxonberg/server/mud/lib/spatial/Placing';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';

export default class CuringPot extends PlacingMixin(Vat) {
  constructor() {
    super();
    this.category = 'pot';
    this.setInteriorCapacity(Quantity.of(10, 'L'));
    this.setClosure('open');
  }
}
