/**
 * Cutlery — ⭐ **what you eat WITH, as against what you eat OUT OF.**
 *
 * A horn spoon, a table fork, a table knife. Serviceware: claimed clean
 * from the venue's pool, dirtied by the meal, washed at the basin,
 * counted on the house par — and holding nothing, ever.
 *
 * ⚠⚠ **It was a `CraftVessel`, and the row said why in its own comment:**
 * *"it is claimed when you eat, dirtied by the meal, washed at the basin
 * and counted on the house par. Its interior slot is simply never filled
 * — serviceware without contents."* Every word of that is true, and the
 * conclusion was still wrong: it named the class for the BEHAVIOUR it
 * needed instead of the THING it is, and paid three prices —
 *
 *   - an **interior bulk slot** it never fills;
 *   - an **ice charge** (`iceKg`, `iceForm`, `iceMeltK`), because a
 *     `CraftVessel` is a thing you can ice;
 *   - a `wash()` that had to open with *"⚠ … `getBulk` THROWS on a host
 *     that has no such slot"*. **A method that throws on part of its own
 *     host set is the host set being wrong.**
 *
 * ⭐ And the reason it happened is worth more than the fix: the utensil
 * kind was stored in `category`, which lived on `BulkableMixin` — so
 * *"this is a spoon"* required *"this is a bulk vessel"*, and `eat` found
 * one by asking `MixinApi.isBulkable`. `category` was right where it was;
 * it is the VESSEL kind, shared with vats and kegs, and a vat has one
 * without being serviceware. The cutlery was borrowing a vocabulary that
 * was never about it.
 */

import Thing from '../../lib/stuff/Thing';
import { DetailedMixin } from '../../lib/description/Detailed';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { CraftedMixin } from '../../lib/craft/Crafted';
import { ServiceableMixin } from '../../lib/craft/Serviceable';
import { CutleryMixin } from '../../lib/bulk/Utensil';

// Crafted, because a spoon is made by somebody and carries their mark and
// its grade — the carver is a roster gap, not a reason to drop the stamp.
// Thermal, because it sits in the soup. No Bulkable at all.
const CutleryBase = CutleryMixin(
  ServiceableMixin(CraftedMixin(ThermalMixin(DetailedMixin(Thing)))),
);

export default class Cutlery extends CutleryBase {}
