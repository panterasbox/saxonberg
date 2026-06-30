/**
 * HaulingCreature — the draft-beast carve: a rideable creature that can
 * pull a cart. The dedicated home for `HaulerMixin` on the animal side,
 * so the capability lands **only where it's earned** — on the player
 * `Avatar` and on this class — never on the broad `Creature`/`Character`
 * base (the encumbrance doc's "compose the mixin, not the class tree"
 * rule; most creatures never haul).
 *
 * Composition: `Hauler + Mountable + PostRegistration` on `Character`.
 * It builds on the `Character` agency layer (so it is `Mobile` — it can
 * traverse — and `Slotted` — Mountable's rider slot resolves against the
 * body plan); `MountableMixin` confers the rider slot (a player mounts
 * it and drives the move); `HaulerMixin` confers the cart hitch. The
 * `PostRegistration` marker matches the `NPC` archetype so the clone
 * pipeline runs `postRegister`. Cast templates set
 * `class: /lib/character/HaulingCreature` and author the body plan / mount
 * slot as data — no per-beast subclass needed.
 *
 * v1 bundles `Mountable` because the worked example is a horse you ride
 * while it tows your cart. A non-ridden draft animal (an ox you lead)
 * would drop `Mountable`; that variant lands when content needs it.
 *
 * See docs/subsystems/encumbrance.md and docs/subsystems/conveyance.md.
 */

import { Character } from './Character';
import { PostRegistrationMixin } from '../stuff/PostRegistration';
import { MountableMixin } from '../slot/Mountable';
import { HaulerMixin } from '../slot/Hauler';

const HaulingCreatureBase = HaulerMixin(
  MountableMixin(PostRegistrationMixin(Character)),
);

export class HaulingCreature extends HaulingCreatureBase {}

export default HaulingCreature;
