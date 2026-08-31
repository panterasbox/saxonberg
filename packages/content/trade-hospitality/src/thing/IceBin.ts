/**
 * IceBin — the bar's insulated ice holder: a `Thermos` (Flask = Thermal +
 * Sealable + Bulkable, plus Detailed) whose interior is bottling's `ice`
 * material, sealed by default so the ice keeps. A recipe's `ice:` draws
 * the `crafting.iceKg` dial's worth from any reachable bulk holder whose
 * matter carries the `ice` tag — the bin is that holder, and the keeper
 * refills it from bagged ice (`pour ice into bin`). No ice machine: v1
 * buys ice (the slate's Part 10); the machine waits for power.
 *
 * Ships at `/trade/hospitality/thing/IceBin` (the capability rung).
 */

import Thermos from '@saxonberg/server/mud/platform/thing/Thermos';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';

export default class IceBin extends Thermos {
  constructor() {
    super();
    // ⭐ Fixed in place. Set under the lip where the bartender works;
    // the ice is what you take, not the bin.
    this.fixedInPlace = true;
    (this as unknown as { interiorBulk: boolean }).interiorBulk = true;
    this.setInteriorCapacity(Quantity.of(30, 'L'));
    this.setBarrier('vacuum');
    this.setKeywords(['bin', 'ice-bin', 'ice']);
    this.setPrimaryKeyword('bin');
  }
}
