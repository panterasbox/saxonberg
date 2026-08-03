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
 * Seeded as `domain` content (e.g. `/obj/gear/backpack`) with
 * `data.slotClaims: { /obj/species/BodyPlan/biped: [torso] }`.
 */

import { Vessel } from '../../lib/stuff/Vessel';
import { SlottableMixin } from '../../lib/slot/Slottable';
import { WearableMixin } from '../../lib/slot/Wearable';

const PackBase = WearableMixin(SlottableMixin(Vessel));

export default class Pack extends PackBase {}
