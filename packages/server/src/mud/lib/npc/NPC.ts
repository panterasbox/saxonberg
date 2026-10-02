/**
 * NPC — the thin archetype class for authored, non-player characters:
 * `Character` + `Behaved` — the clone pipeline invokes `onCreate`, where
 * `Behaved` wires its `behaviors:` spec list.
 *
 * Keeping `Behaved` on this subclass — rather than on base `Character` —
 * keeps automated behavior **off player Avatars** (which extend
 * `ShelledCharacter`, not `NPC`) and off the base. Cast templates set
 * `class: /lib/npc/NPC` and compose behavior entirely as data; no
 * per-NPC subclass is needed (see docs/subsystems/behavior.md).
 *
 * `BehavedMixin` is **outermost**, so the `onCreate` the clone pipeline
 * calls resolves to it first (which then wires behaviors) and chains
 * `super` down through the rest of the stack to the terminal on `Stuff`.
 *
 * ⚠ `NPC`'s own `onCreate` is therefore the OUTERMOST one and must
 * chain `super.onCreate()`, or `behaviors:` stops being wired and
 * every authored person in the realm goes quietly inert.
 */

import { Character } from '../character/Character';
import { CostumedMixin } from '../stuff/Staged';
import { BehavedMixin } from '../behavior/Behaved';
import type { FieldMeta } from '../mixin';

// ⭐⭐ `CostumedMixin` — `costume:`, the third designation beside `props:`
// and `cast:`. It shipped here as a `wears: string[]` field plus a
// `onCreate` dressing step, which review correctly called out as
// `applyProps` with the check missing. It is on the Staged rail now:
// an instruction field, a Phase-2 applier, a once-flag, and the class
// gated before anything is cloned. See `lib/stuff/Staged.ts`.
const NPCBase = CostumedMixin(
  BehavedMixin(Character),
);

export class NPC extends NPCBase {

  /**
   * Chain first, then dress. `BehavedMixin.onCreate` is what wires
   * `behaviors:`, and this override sits outside it.
   *
   * ⚠ The dressing is deliberately **not awaited into** the clone
   * pipeline's critical path beyond what `onCreate` already is: a
   * garment that fails to clone must not take the person down with it,
   * which is why `wearGarments` swallows per-garment failures.
   */
  public override async onCreate(): Promise<void> {
    await (super.onCreate as () => Promise<void>).call(this);
  }
}

export default NPC;
