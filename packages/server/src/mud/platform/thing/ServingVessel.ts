/**
 * ServingVessel — ⭐ **a vessel a made portion reaches a person in.**
 *
 * The line this class draws is between what a trade WORKS in and what a
 * portion is SERVED in. Both are claimed from the venue's pool, dirtied
 * by use, washed at the basin and counted on the house par — that is
 * `CraftVessel`, and it is shared. Only one of them is something you put
 * to your mouth, and that is the whole content of this class: it carries
 * {@link PalatableMixin}, the derived taste reading.
 *
 * The bar's nine glasses are `ServingVessel`s. So are the syrup and juice
 * bottles, which hold something a person genuinely tastes. So is the
 * `CookPot` — a cook tasting the pot is the archetypal use of a palate,
 * and it is what Odo does on his idle beat.
 *
 * ⚠ **What stays on `CraftVessel`, and why it matters:** the wort bucket,
 * the must bucket, the tallow crock, the oil bottle — and the **wash
 * bucket**, which is dirty water. Also the cutlery, which is claimed and
 * washed and par-counted like everything else but holds nothing. Before
 * this class existed they were all palatable, so a table knife and a
 * bucket of wash water read as things you taste.
 *
 * ⭐⭐ **This is the third time in one build that the answer was a class
 * named for the concept rather than a wider base.** The spoilage gauge
 * went `ThingBase` → `Prop` → `Provision`; `Prop` itself turned out to be
 * a name for nothing; and the palate went `BulkableMixin` → `CraftVessel`
 * → here. Each time the wide host was defended with a true sentence — "a
 * prop is often food", "this is a vessel somebody made something in" —
 * that was a claim about the ROWS and not about the class. The tell is
 * the same every time: **a list in the doc block that is narrower than
 * where the mixin actually composes.**
 */

import CraftVessel from './CraftVessel';
import { PalatableMixin } from '../../lib/metabolism/Palatable';

const ServingVesselBase = PalatableMixin(CraftVessel);

export default class ServingVessel extends ServingVesselBase {}
