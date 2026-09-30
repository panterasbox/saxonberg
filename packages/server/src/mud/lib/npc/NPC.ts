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
 *
 * ⚠ `NPC`'s own `postRegister` is therefore the OUTERMOST one and must
 * chain `super.postRegister()`, or `behaviors:` stops being wired and
 * every authored person in the realm goes quietly inert.
 */

import { Character } from '../character/Character';
import { PostRegistrationMixin } from '../stuff/PostRegistration';
import { CostumedMixin } from '../stuff/Staged';
import { BehavedMixin } from '../behavior/Behaved';
import type { FieldMeta } from '../mixin';

// ⭐⭐ `CostumedMixin` — `costume:`, the third designation beside `props:`
// and `cast:`. It shipped here as a `wears: string[]` field plus a
// `postRegister` dressing step, which review correctly called out as
// `applyProps` with the check missing. It is on the Staged rail now:
// an instruction field, a Phase-2 applier, a once-flag, and the class
// gated before anything is cloned. See `lib/stuff/Staged.ts`.
const NPCBase = CostumedMixin(
  BehavedMixin(PostRegistrationMixin(Character)),
);

export class NPC extends NPCBase {

  /**
   * Chain first, then dress. `BehavedMixin.postRegister` is what wires
   * `behaviors:`, and this override sits outside it.
   *
   * ⚠ The dressing is deliberately **not awaited into** the clone
   * pipeline's critical path beyond what `postRegister` already is: a
   * garment that fails to clone must not take the person down with it,
   * which is why `wearGarments` swallows per-garment failures.
   */
  public override async postRegister(): Promise<void> {
    await (super.postRegister as () => Promise<void>).call(this);
  }
}

export default NPC;
