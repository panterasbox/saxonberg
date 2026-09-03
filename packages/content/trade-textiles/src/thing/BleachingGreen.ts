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
    /*
     * ⚠⚠ `liquidTight`, NOT `open` — and the distinction cost this
     * build a whole live drive.
     *
     * `closure` is the RETENTION axis: `BulkableLogic.requiredClosureFor`
     * returns `liquidTight` for every material there is ("v1 has only
     * liquid"), so anything poured into an `open` interior drains
     * straight through to the floor. The LID is the other axis
     * entirely — `Sealable`'s `setOpen(true)`, which is what "no lid,
     * open to the air" actually means, and what the over-ret / the
     * unsealed ferment read.
     *
     * Authored `open` here on the reasoning "a pit in the ground has no
     * lid", and the result was a vessel that could never hold anything:
     * `pour sheaf into pit` answered "The liquid runs straight through
     * a retting pit and pools on the floor", the straw was destroyed,
     * and the chain's first stage was unrunnable. No unit test caught
     * it because the pack's tests build the pit's contents directly
     * instead of pouring into it.
     */
    this.setClosure('liquidTight');
    // Open to the sky, which is the entire mechanism — and `setOpen`
    // is where "open to the sky" lives.
    this.setOpen(true);
    this.setKeywords(['green', 'bleaching-green', 'sward']);
    this.setPrimaryKeyword('green');
  }
}
