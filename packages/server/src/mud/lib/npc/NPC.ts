/**
 * NPC — the thin archetype class for authored, non-player characters:
 * `Character` + `Behaved` (+ the `PostRegistration` marker so the clone
 * pipeline invokes `postRegister`, where `Behaved` wires its
 * `behaviors:` spec list).
 *
 * Keeping `Behaved` on this subclass — rather than on base `Character` —
 * keeps automated behavior **off player Avatars** (which extend
 * `ShelledCharacter`, not `NPC`) and off the base. Cast templates set
 * `class: /lib/npc/NPC` and compose behavior entirely as data; no
 * per-NPC subclass is needed (see docs/subsystems/behavior.md).
 *
 * Composition order is load-bearing: `BehavedMixin` is **outermost** so
 * the single `postRegister` the clone pipeline calls resolves to it
 * (which then wires behaviors); `PostRegistrationMixin` sits just below
 * to supply the marker + the terminal no-op. (`CommandGiver`'s own
 * `postRegister` deeper in the chain is shadowed, but it self-seeds
 * lazily — and NPCs emit through Apis directly, not the command system.)
 */

import { Character } from '../character/Character';
import { PostRegistrationMixin } from '../stuff/PostRegistration';
import { BehavedMixin } from '../behavior/Behaved';

const NPCBase = BehavedMixin(PostRegistrationMixin(Character));

export class NPC extends NPCBase {}

export default NPC;
