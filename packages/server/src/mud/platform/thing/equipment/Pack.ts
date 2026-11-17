/**
 * Pack — a wearable container: a `Vessel` you can put on.
 *
 * A backpack, satchel, or bandolier — a container-object (so it holds
 * cargo and carries its own mass, both from `Vessel`) that is also
 * `Wearable` (it claims a body-plan slot and is worn via the slot
 * substrate, exactly like `Garment`). Worn carry couples at the worn
 * floor (`1.0`), so stowing a load in a Pack — versus carrying it loose
 * in hand — pays no surcharge and leaves the hands free; that falls out
 * of the encumbrance placement coupling (see
 * `lib/encumbrance/LoadBearing`), not from anything Pack adds.
 *
 * Natural sibling of `Garment` in the `equipment` subsystem: a Garment
 * is a wearable `Thing` (holds nothing); a Pack is a wearable `Vessel`
 * (holds things). Variety (rucksack vs satchel, a low-`transmissionFactor`
 * bag of holding worn on the back) is content + composition, not
 * subclassing.
 *
 * ⭐ The ONE class of every worn or hung container (size and carrying D27):
 * a satchel (`[torso]`, ready), a rucksack (`[back]`, packed), and the
 * rows that claim no body slot and HANG from a belt or a strap — a belt
 * pouch, a purse, a canteen clip, a saddlebag — and the shaped ones
 * (`shapedTo:` — a holster, a sheath, a quiver; drawn fast).
 *
 * Seeded as `domain` content (e.g. `/stuff/thing/gear/backpack`) with
 * `data.slotClaims: { /stuff/idea/species/BodyPlan/biped: [back] }`.
 */

import { Vessel } from '../../../lib/stuff/Vessel';
import { SlottableMixin } from '../../../lib/slot/Slottable';
import { WearableMixin } from '../../../lib/slot/Wearable';
import { PlacingMixin } from '../../../lib/spatial/Placing';
import { SealableMixin } from '../../../lib/spatial/Sealable';

// ⭐ Placing outermost (size and carrying D27): a pack's straps and
// carabiners are a hanging length (`placements: [from]` on the row) — a
// canteen clipped to the strap is ready while the pack's inside is packed.
// A pack whose row says nothing offers nothing but its inside.
//
// ⭐ Sealable (size and carrying W6): a pack has a flap, a drawstring or a
// lid — the oilskin pouch keeps a letter dry only SHUT (D22: a shut holder
// whose material takes no water is liquid-tight; a shut canvas pack is
// not), a shut pack hides what is in it (D24), and `close satchel` is the
// shipped verb. Every pack starts OPEN (the constructor), so a pack that
// was never shut behaves exactly as before; a row may author `open: false`.
const PackBase = PlacingMixin(
  WearableMixin(SlottableMixin(SealableMixin(Vessel))),
);

export default class Pack extends PackBase {
  constructor() {
    super();
    this.setOpen(true);
  }

  /** ⭐ A pack is cloth or leather: it gives, packs and squeezes (size and carrying D1). */
  static defaultShape = 'flexible';

  /** ⭐ Its inside, and nothing to hang from until the row names straps (D27). */
  static override defaultPlacements: readonly string[] = [];
}
