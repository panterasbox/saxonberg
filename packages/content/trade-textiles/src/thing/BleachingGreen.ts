/**
 * BleachingGreen — land laid out to whiten linen, and ⭐ a PLACE rather
 * than a piece of equipment.
 *
 * Retting's shape applied to **weather** instead of a vessel: you lay
 * the stuff out, and sun and dew and lye do it over months. **Zero
 * verbs**, a genuine weather consumer, and the reason a bleaching green
 * is *acreage dedicated to a purpose* — which is what it historically
 * was, and what chlorine bleaching later turned back into farmland.
 *
 * ⚠ There is no over-bleach. Unlike the pit, leaving it out longer only
 * makes it whiter and then stops — the profile authors no
 * `turnedMaterial`, and the absence is the point rather than an
 * oversight.
 *
 * ⚠⚠ **An honest limit, stated rather than fudged.** This whitens the
 * FIBRE, in bulk, because that is what the shipped substrate models
 * with no new mechanism. PIECE bleaching — laying the woven cloth
 * itself out — wants a durative gauge on a discrete object, which is a
 * mixin and therefore kernel; it is a real deferral and not a pretence
 * that fibre-bleaching is the same act. Yarn and fibre bleaching are
 * both historically real, so what ships is true, just narrower than the
 * picture.
 */

import Vat from '@saxonberg/server/mud/platform/thing/Vat';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';

export default class BleachingGreen extends Vat {
  constructor() {
    super();
    this.category = 'bleaching-green';
    this.setInteriorCapacity(Quantity.of(200, 'L'));
    // Open to the sky, which is the entire mechanism.
    this.setClosure('open');
    this.setOpen(true);
    this.setKeywords(['green', 'bleaching-green', 'sward']);
    this.setPrimaryKeyword('green');
  }
}
