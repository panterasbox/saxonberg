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
 *  - **`ProducingMixin`** — the taps, which are what you keep it FOR.
 *  - the **act affordances**, because they belong to the animal you are
 *    standing next to.
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
import { HandledMixin } from '../lib/Handled';
import { PerceptibleMixin } from '@saxonberg/server/mud/lib/description/Perceptible';
import { ProducingMixin } from '../lib/Producing';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

/**
 * ⚠⚠ **`PerceptibleMixin`, and it is a bug fix rather than a feature.**
 *
 * A `Creature` composes `Visible` and `Named` but NOT `Perceptible`,
 * because a person is addressed by their NAME. An animal is not: it is
 * addressed by what it is — *the cow*, *the beast*, *the heifer*. The
 * livestock row has always authored
 * `keywords: [head, stock, animal, beast]`, and every one of them was
 * **silently discarded**: the Hydrator writes only what `fieldMeta`
 * declares, nothing declared `keywords`, and the field did not exist.
 *
 * The symptom in play was that a drafted head answered to `stock` and to
 * nothing else — and only because *"a head of stock"* is its short
 * description. `handle beast` said *"that is not an animal you can work
 * with"* about the animal standing in front of you. Found by driving it.
 */
const LivestockBase = ProducingMixin(
  HandledMixin(HandlingMixin(PerceptibleMixin(Creature))),
);

export default class Livestock extends LivestockBase {
  /**
   * ⭐⭐ **Only the acts that are true of a head of STOCK.**
   *
   * `handle` comes from `HandledMixin` and the three taps come from
   * `ProducingMixin`, because those are things an animal HAS rather than
   * things a class IS — a sheepdog is handled and gives nothing, a milk
   * cow is both. What is left here is the short list that genuinely
   * needs a herd behind it or a carcass in front of it:
   *
   *   - `return` — put it back in the tally it was cut out of;
   *   - `breed`  — the herd's own reproduction;
   *   - `butcher`— it is beef at the end, and that is the unsentimental
   *     fact the design likes. ⚠ A working dog is NOT this, which is the
   *     whole reason the collie stopped being a `Livestock`.
   *
   * ⚠ A row's `commandContributions:` is dead silently — the affordance
   * is a static on a class.
   */
  static commandContributions: CommandContributions = {
    self: [],
    peers: [
      'trade/ranching/cmd/ranching/return.yaml',
      'trade/ranching/cmd/ranching/butcher.yaml',
      'trade/ranching/cmd/ranching/breed.yaml',
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
