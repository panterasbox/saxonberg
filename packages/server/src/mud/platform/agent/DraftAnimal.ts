/**
 * DraftAnimal — **a beast kept in the shafts: it pulls, and it can be
 * ridden.**
 *
 * Composition: `Mountable(Hauler(Beast))`.
 *
 * ⚠⚠ **It replaces `platform/agent/HaulingCreature`, which was
 * `Mountable(Character)` — a horse that was a
 * PERSON.** That class's own docstring stated the reason in the repo's
 * words: *"The cart-pulling capability itself comes from `Character`
 * (which composes `HaulerMixin` — every PC and NPC-character can hitch a
 * cart)"*, and *"A non-ridden draft animal (an ox you lead) is just a
 * `Character` with a draft-mass body plan."* ⭐ **A class reaching for a
 * whole rung to get one mixin is this project's documented
 * mixin-on-the-wrong-host tell**, and the cost was that a pit pony
 * composed `CasterMixin` and `EmployedMixin`.
 *
 * `HaulingCreature` was deleted rather than renamed: its name claimed
 * the one thing it did not provide.
 *
 * ## Why each mixin sits exactly here
 *
 * - **`Hauler` here, and on `Character`, and on neither rung between.**
 *   ⚠ `hitch.yaml:35` gates its target on `HaulerMixin` — it is the
 *   ONLY reader (zero `MixinApi.isHauler` narrowings, zero affordance
 *   statics), so that arg gate is the whole of its reachability. On
 *   `Actor` the binder would accept `hitch cart to canary` and the
 *   refusal would move from an honest gate to breakaway physics. Every
 *   person self-hauls; a draft animal hauls; a wolf does not.
 * - **`Mountable` here, not on `Beast`.** Composing it MINTS a mount
 *   slot (`Mountable.ts:5-8`), so a `Beast` that carried it would let
 *   the binder accept `mount wolf`.
 * - **Not `KeptAnimal`.** No bond, no name, no residency pin — and
 *   `lint:kept-animals` direction 2 fails a `Bonded` class whose species
 *   authors no `biddability`.
 * - **Kernel, not pack.** Its two consumers are in `transport` and
 *   `trade-mining`, which have no common pack ancestor —
 *   `CLAUDE.md § Module Categories`: *substrate goes to the KERNEL when
 *   its composers have no common pack ancestor.* The same reason
 *   `HaulingCreature` was kernel.
 * - **No `Chattel`, no `Branded`** — filed as the owner's call (E11 of
 *   the Agent plan). D2's definition (bought, lent, stolen, with a chain
 *   of title) says a horse is the paradigm case; D2's shipped host list
 *   says the animal rungs are `KeptAnimal` and `Livestock` and nothing
 *   else. Two lines if the answer is yes, and `Creature.chattel.test.ts`
 *   is the test that changes.
 *
 * ⭐ **A second draft animal is a ROW** — a species, a mass, a brain. An
 * ox you lead but do not ride has no row today and gets no class until
 * it does.
 */

import Beast from './Beast';
import { HaulerMixin } from '../../lib/slot/Hauler';
import { MountableMixin } from '../../lib/slot/Mountable';

const DraftAnimalBase = MountableMixin(HaulerMixin(Beast));

export class DraftAnimal extends DraftAnimalBase {}

export default DraftAnimal;
