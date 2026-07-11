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
import { HarmApi } from '../../api/harm';

const NPCBase = BehavedMixin(PostRegistrationMixin(Character));

export class NPC extends NPCBase {
  /**
   * Chain `super.postRegister()` (Behaved wires the `behaviors:` spec),
   * then re-arm the wound-tick — the NPC body-warm seam mirroring
   * `Avatar.enter` for players. A wounded NPC restored from a template
   * (its bleeding trauma persisted, its transient tick handle lost)
   * resumes bleeding/healing. Idempotent no-op when it carries no active
   * trauma. (A bare `Creature`/`Character` without this hook won't
   * auto-re-arm — a documented degenerate; the proof body is an Avatar.)
   */
  override async postRegister(context?: unknown): Promise<void> {
    await super.postRegister(context);
    HarmApi.rearmWoundTicks(this);
  }
}

export default NPC;
