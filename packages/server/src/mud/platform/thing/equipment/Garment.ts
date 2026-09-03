/**
 * Garment — a worn thing, and after the textiles build the ONLY one.
 *
 * A Garment is a `Thing` (described, physical, carriable) that is also
 * `Wearable` — it claims body-plan slots (`slotClaims`) and is worn
 * through the slot substrate.
 *
 * ## ⭐⭐ There is no `Armor` class, because armor-ness is not a class
 *
 * `Armor` was a sibling that composed four more mixins and added no
 * behavior. Once `Garment` composes the same four, the two stacks are
 * byte-identical — and the retired class was asserting something the
 * model does not believe: **armor-ness is material + construction
 * form.** A steel breastplate is a Garment whose material is steel and
 * whose form is `plate`; a linen shirt is a Garment whose material is
 * linen and whose form is `woven`. The blow resolves the same way
 * through both, because `ConditionApi.inflict` walks whatever
 * `Constructed` + `Wearable` occupants cover the struck part and asks
 * the material and the form — it never asks what class they are.
 *
 * That is the general rule stated in the slate — *a garment's purpose is
 * which exposure channel it intercepts, not what class it is* — applied
 * to the one class that was already an exception. Nobody authors *"this
 * is a lab coat"*: you author white, cheap, woven cloth covering torso
 * and arms and sitting outermost, and lab-coat-ness emerges.
 *
 * ⚠ The `armor/` **content directory keeps its name** — it is a content
 * namespace, not a class.
 *
 * ## What the composition buys
 *
 * - `Tangible` (on `Thing`) — the material, and a real **mass**, so a
 *   coat is felt by encumbrance.
 * - `ConstructedMixin` — the form word, and with it the resist profile,
 *   the layer band, and the fabric's loft and weave density.
 * - `DurableMixin` — a wear-on-use condition, so clothes wear out and
 *   `repair` works on them. A durable good, NOT a crafting tool.
 * - `CraftedMixin` (which composes `GradedMixin`) — the as-made grade
 *   and the maker's mark, so a garment can be a recipe output and a
 *   store-bought one simply has an empty mark.
 * - `DetailedMixin` — the parts a viewer can examine, and the surface a
 *   maker's authored prose rides on.
 *
 * Variety stays content + composition, never subclassing: *type* is
 * `slotClaims` + description; *added behavior* is a mixin layered on
 * (`DisguiseGarment` is the one shipped example, and it inherits all of
 * the above for free).
 *
 * Seeded as content (e.g. `/stuff/thing/clothes/white-coat`) with
 * `data.slotClaims: { /stuff/idea/species/BodyPlan/biped: [torso] }`,
 * `_materialPath`, `constructionForm`, `gradeBand` and `mass`.
 */

import Thing from '../../../lib/stuff/Thing';
import { DetailedMixin } from '../../../lib/description/Detailed';
import { ConstructedMixin } from '../../../lib/material/Constructed';
import { DurableMixin } from '../../../lib/material/Durable';
import { CraftedMixin } from '../../../lib/craft/Crafted';
import { SlottableMixin } from '../../../lib/slot/Slottable';
import { WearableMixin } from '../../../lib/slot/Wearable';

const GarmentBase = WearableMixin(
  SlottableMixin(
    CraftedMixin(DurableMixin(ConstructedMixin(DetailedMixin(Thing)))),
  ),
);

export default class Garment extends GarmentBase {}
