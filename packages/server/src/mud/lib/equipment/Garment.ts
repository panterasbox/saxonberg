/**
 * Garment — a wearable item of equipment.
 *
 * The first concrete inhabitant of the `equipment` subsystem: gear a
 * character *equips*. A Garment is a `Thing` (described, physical,
 * carriable) that is also `Wearable` — it claims body-plan slots
 * (`slotClaims`) and is worn via the slot substrate (`SlotApi`).
 *
 * Variety is content + composition, not subclassing:
 *   - *type* (shirt vs coat vs helmet) = `slotClaims` + description.
 *   - *added behavior* (armor's protection, a cloak's warmth, jewelry's
 *     enchantment) = composed mixins layered on, when those subsystems
 *     land. Armor is a Garment that *also* composes a defense mixin, not
 *     a subclass.
 *
 * A wielded sibling (`Weapon`, composing `WieldableMixin`) belongs in
 * this same `equipment` subsystem when weapons arrive.
 *
 * Seeded as `domain` content (e.g. `/obj/clothes/white-coat`)
 * with `data.slotClaims: { /lib/body-plans/biped: [torso] }`.
 */

import Thing from '../stuff/Thing';
import { SlottableMixin } from '../slot/Slottable';
import { WearableMixin } from '../slot/Wearable';

const GarmentBase = WearableMixin(SlottableMixin(Thing));

export default class Garment extends GarmentBase {}
