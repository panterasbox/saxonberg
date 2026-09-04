/**
 * Livestock — **one head, drafted out of a herd and standing in front of
 * you.**
 *
 * It is a `Creature` with three things added and nothing else:
 *
 *  - **`HandlingMixin`** (kernel) — how easy it is to work with, which
 *    is D27's honest answer to *what is the individual axis for an
 *    animal that must not have pet-love*, and D46's answer to *what
 *    makes it dangerous*.
 *  - a **back-reference to the register** — its herd and its index,
 *    which together ARE its identity. ⚠ The object is the transient
 *    thing here; the record is what persists.
 *  - the **`return` affordance**, because the act belongs to the animal
 *    you are standing next to.
 *
 * ⭐ Ownership, chain-of-title and branding it inherits from `Creature`,
 * which gained `ChattelMixin` and `BrandedMixin` in this same wave —
 * which is why a stolen animal cannot be sold cleanly (D98) and why
 * branding livestock, the thing marks were invented for, needed no new
 * mechanism at all.
 *
 * ⚠ **There is no `Herd` class and there never will be.** The herd is a
 * record; the room's prose describes animals; there is never a
 * herd-object to `look` at.
 */

import { Creature } from '@saxonberg/server/mud/lib/creature/Creature';
import { HandlingMixin } from '@saxonberg/server/mud/lib/husbandry/Handling';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

export default class Livestock extends HandlingMixin(Creature) {
  /**
   * ⭐ The animal affords the acts you do TO an animal. ⚠ A row's
   * `commandContributions:` is dead silently — the affordance is a
   * static on a class.
   */
  static commandContributions: CommandContributions = {
    self: [],
    peers: [
      'trade/ranching/cmd/ranching/return.yaml',
      'trade/ranching/cmd/ranching/handle.yaml',
    ],
    environment: [],
  };

  static fieldMeta: FieldMeta = {
    herdId: { persistent: true },
    headIndex: { persistent: true },
  };

  /**
   * The register this head belongs to. ⚠ Empty for an animal that was
   * never in one — a pet, a single milk cow — which is a legal state and
   * not an error: D19's base case is the individual, and the herd is the
   * compression you apply to animals you have stopped looking at.
   */
  public herdId = '';

  /** Its index within that herd — its identity, and it never changes. */
  public headIndex = -1;

  public getHerdId(): string {
    return this.herdId;
  }

  public getHeadIndex(): number {
    return this.headIndex;
  }

  /** Bind this object to the record it was drafted out of. */
  public bindToHerd(herdId: string, index: number): void {
    this.herdId = herdId;
    this.headIndex = index;
  }

  /**
   * ⭐ **What a person standing here can see**, in one sentence: the
   * animal's condition and how it takes to being approached, read
   * separately.
   *
   * ⚠ Both are BANDS. A precise body-condition score is palpation of
   * spine and ribs and costs an act (`handle`); by eye you get *thin*,
   * *good*, *fat*, which is exactly what by eye gets you in life.
   */
  public stockmanRead(): string {
    return `${this.bodyConditionPhrase()}; ${this.handlingPhrase()}`;
  }
}
