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
import { BehavedMixin } from '../behavior/Behaved';
import type { FieldMeta } from '../mixin';

const NPCBase = BehavedMixin(PostRegistrationMixin(Character));

export class NPC extends NPCBase {
  /**
   * ⭐⭐ **What this person is wearing** — garment template paths, put
   * on at `postRegister`.
   *
   * Until the envelope build there was no way to author this: no
   * `wears:`, no `worn:`, no `outfit:` on any NPC class, archetype or
   * row in the tree, and `props:` places a thing onto a `Surfaced`
   * host rather than onto a person. **Every authored person in the
   * realm was naked**, and the only reason it never showed is that
   * every interior was 21 °C by decree and a naked body is survivable
   * at 21 °C. This build removes the decree, so the realm's people need
   * clothes before its rooms are allowed to get cold.
   *
   * The alternative — dials soft enough that a naked body outdoors at
   * 8 °C is fine for a night — is dishonest physics, and would have
   * made clothing worth nothing at exactly the moment the textiles
   * chain gave it a price.
   */
  public wears: string[] = [];

  static fieldMeta: FieldMeta = {
    wears: { persistent: true, authorable: true },
  };

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
    if (this.wears.length > 0) await this.wearGarments(this.wears);
  }
}

export default NPC;
