/**
 * WoadVat — ⭐⭐ **a different machine, and it is ALIVE.**
 *
 * Woad does not dissolve. It is chemically **reduced** in an alkaline,
 * oxygen-poor vat, and then:
 *
 * ```
 * > dye shirt in the woad vat
 *   You draw the linen out yellow-green. As the air takes it,
 *   the colour walks up through jade to a deep, even blue.
 * ```
 *
 * The change in air is real, it is the most striking moment in the
 * chain, and it is **free** — it is simply what indigo does.
 *
 * ⭐⭐ **The vat is fermentation-shaped, so `MaturingMixin` models it —
 * and the honest version is therefore a LIVING thing.** It is kept by
 * feeding it, killed by too much oxygen or the wrong pH, and takes days
 * to bring back. **The dyer's most valuable possession, and the thing
 * that punishes neglect.**
 *
 * ⚠ That is a harsher failure than anything else in the chain: neglect
 * destroys *capital*, not a batch. Deliberate. And ⭐ magically holding
 * it is a standing bill against the price of feeding it bran — the
 * craft wins on permanence, which is the shape every magic answer in
 * this build lands on.
 *
 * ⚠ `sealed`, unlike every other vat here: the whole trick is keeping
 * the air OUT until the moment the cloth comes up.
 */

import DyeVat from './DyeVat';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';

export default class WoadVat extends DyeVat {
  constructor() {
    super();
    this.category = 'woad-vat';
    this.setInteriorCapacity(Quantity.of(150, 'L'));
    // ⚠ SEALED. Oxygen is what kills a reduction vat, and the seal is
    // the difference between a living vat and a dead one.
    this.setClosure('sealed');
    this.setOpen(false);
    this.setKeywords(['vat', 'woad-vat', 'woad', 'bath']);
    this.setPrimaryKeyword('woad-vat');
  }
}
