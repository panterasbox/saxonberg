/**
 * HaulingCreature — a rideable draft beast: a `Mountable` `Character` you
 * mount and that tows your cart. The cart-pulling capability itself comes
 * from `Character` (which composes `HaulerMixin` — every PC and
 * NPC-character can hitch a cart); this class adds the **rideable** slot
 * (`Mountable`) so the worked example — a horse you ride while it hauls —
 * works end-to-end.
 *
 * Composition: `Mountable + PostRegistration` on `Character`. It builds on
 * the `Character` agency layer (so it is `Mobile` — it can traverse — and
 * `Slotted` — Mountable's rider slot resolves against the body plan; and
 * `Hauler` — the cart hitch); `MountableMixin` confers the rider slot.
 * The `PostRegistration` marker matches the `NPC` archetype so the clone
 * pipeline runs `postRegister`. Cast templates set
 * `class: /lib/character/HaulingCreature` and author the body plan / mount
 * slot as data — no per-beast subclass needed.
 *
 * A non-ridden draft animal (an ox you lead) is just a `Character` with a
 * draft-mass body plan — it already hauls; it simply wouldn't need this
 * class's `Mountable`.
 *
 * See docs/subsystems/encumbrance.md and docs/subsystems/conveyance.md.
 */

import { Character } from '../../lib/character/Character';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import { MountableMixin } from '../../lib/slot/Mountable';

const HaulingCreatureBase = MountableMixin(PostRegistrationMixin(Character));

export class HaulingCreature extends HaulingCreatureBase {}

export default HaulingCreature;
