/**
 * TapController — `tap <tree>`, the sap verb, and ⭐ **three subjects
 * that share no mixin.**
 *
 * The body of the act is the kernel's {@link TapActController}: plan,
 * engage the hands, land at completion. What this adds is the narrowing,
 * because `tap`'s target slot is polymorphic (`requires: any`, the
 * `fell.yaml` shape) and three different things can be in it:
 *
 *  1. ⭐ **a `SapStandard`** — the tree answers, and owns both phases of
 *     the verb (set a spile, or draw what has run).
 *  2. ⭐⭐ **a bare species word in a Wood** — `tap oak` binds NOTHING,
 *     because the stand is the ROOM and a room is not a bindable
 *     target, so it lands as `{stuff: null, raw: 'oak'}`. The WOOD
 *     answers it, and the answer is the design being taught: *a stand is
 *     a number of trees, not a stem.* ⚠ Not a guard re-narrowing a host
 *     set — the wood affords the verb precisely so it can say that.
 *  3. **anything else** — *nothing here takes a spile*, and at the
 *     treeline (no `Wood`, no trees) the verb is afforded by nothing at
 *     all, so the platform's not-here answer covers `tap` and `fell`
 *     identically. That parity is deliberate.
 */

import { TapActController } from '@saxonberg/server/mud/platform/idea/cmd/inventory/TapActController';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tappable } from '@saxonberg/server/mud/lib/husbandry/Tappable';
import { STAND_MIXIN } from '../../../lib/Stand';

export default class TapController extends TapActController {
  protected tapKey(): string {
    return 'sap';
  }

  /**
   * ⚠ A `SapStandard` only. A bare species word, or anything else,
   * falls through to {@link nothingHere} — which is where the wood's
   * own sentence is said.
   */
  protected override async subjectOf(
    model: Parameters<TapActController['execute']>[0],
    _giver: Stuff,
  ): Promise<(Stuff & Tappable) | null> {
    const bound = model.target?.stuff ?? null;
    if (bound === null) return null;
    if (!MixinApi.isProducing(bound)) return null;
    // ⭐ It must be a TREE, not merely a producer. A hive standing in a
    // sugarbush composes `ProducingMixin` too, and `tap hive` must not
    // half-work — the hive's verb is `rob`.
    if (typeof (bound as unknown as { maxSpiles?(): number }).maxSpiles !== 'function') {
      return null;
    }
    return bound as unknown as Stuff & Tappable;
  }

  /**
   * ⭐⭐ The sentence that teaches the design, said by the wood when
   * the wood is what answered.
   */
  protected nothingHere(
    model: Parameters<TapActController['execute']>[0],
    giver: Stuff,
  ): ReturnType<typeof Mml.compose> {
    const bound = model.target?.stuff ?? null;
    if (bound !== null) {
      // Something was named and it is not a sap tree. A hive gets its
      // own sentence, because "nothing here takes a spile" said of a
      // hive would read as a bug rather than as an answer.
      if (MixinApi.isProducing(bound)) {
        return Mml.compose`${Mml.thing(bound)} gives something, but not to a spile.`;
      }
      return Mml.compose`${Mml.thing(bound)} is not a tree that runs.`;
    }
    // Nothing bound. If we are standing in a Wood, the WOOD answers —
    // and this is the line the drive checks.
    if (inAWood(giver)) {
      return Mml.compose`A stand is a number of trees, not a stem. A spile goes into one tree you can put your hand on.`;
    }
    return Mml.compose`There is nothing here that takes a spile.`;
  }

  protected override nothingHereReason(): string {
    return 'not-a-sap-tree';
  }
}

/** Is the actor standing in a `Wood`? */
function inAWood(giver: Stuff): boolean {
  const room = MixinApi.isContainable(giver) ? giver.getContainer() : null;
  if (!room) return false;
  return MixinApi.hasMixin(
    room.constructor as never,
    STAND_MIXIN as never,
  );
}
