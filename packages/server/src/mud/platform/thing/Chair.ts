/**
 * Chair — a sittable seat. Its collapsible variant is {@link FoldingChair}
 * (its own file, so seeds can resolve it by path as `/platform/thing/FoldingChair`).
 *
 * `Chair` composition: `Postured` (it offers a posture-bearing `sit`
 * slot the global `sit` verb targets) over `Slotted` (the host slot
 * substrate Postured extends), `Detailed` (the frame + seat sub-features,
 * the natural carriers of per-detail materials) over a `Thing`. The
 * actual `sit:1` slot spec is authored per-seed; the class just supplies
 * the capability. The reusable seat kind the whole campus wants.
 */

import Thing from '../../lib/stuff/Thing';
import { PosturedMixin } from '../../lib/slot/Postured';
import { SlottedMixin } from '../../lib/slot/Slotted';
import { DetailedMixin } from '../../lib/description/Detailed';

const ChairBase = PosturedMixin(SlottedMixin(DetailedMixin(Thing)));

export default class Chair extends ChairBase {
  constructor() {
    super();
    // ⭐ Fixed in place. A stool, a bed, a tub, an armchair: furniture.
    // You rearrange it with `place`; you do not pocket it. A live drive
    // walked out of Dave's Bar carrying four bar stools.
    this.fixedInPlace = true;
  }
}
