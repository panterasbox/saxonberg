/**
 * DigController — `dig [<what>] [with <tool>]`: **turn the ground over and
 * see what comes up.**
 *
 * ⚠⚠ **This verb shipped once and was WITHDRAWN in review.** The fishing
 * build designed it and cut it (MR !268) for one reason: *the yield was
 * hard-coded to a worm.* Everything in this file is arranged so that
 * mistake is not expressible — there is no product name anywhere in it, no
 * branch on what kind of digging is happening, and no list of what a place
 * might give. What comes up is the ground's to say.
 *
 * ## ⭐ The resolution ladder, and why it has three rungs
 *
 *   1. **the bound target**, if it answers the shape — `dig the bank`.
 *   2. **the room**, if it answers — a quarry floor, a turbary. This is the
 *      rung extraction uses, because a working is a Location.
 *   3. **the room's floor**, if it answers — every Location has one since
 *      the ground build, so this is the rung a `Soil` host will be found
 *      on when foraging asks the topsoil what is living in it.
 *
 * Writing all three now is what makes the foraging drop-in free instead of
 * a controller edit — which is the difference between a seam and a promise.
 *
 * ⭐ A bare word that binds nothing (`dig clay`) is passed through as the
 * player's own word, because a band in the column is not a bindable object.
 * The `fell.yaml` shape.
 */

import { WorkedActController, type WorkedActModel } from './WorkedActController';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import type { Diggable, Workable } from '../../../../lib/ground/Workable';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

export default class DigController extends WorkedActController {
  protected async subjectOf(
    model: WorkedActModel,
    giver: Stuff,
  ): Promise<Workable | null> {
    const bound = model.target?.stuff ?? null;
    const asBound = asDiggable(bound);
    if (asBound !== null) return asBound;

    const room = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    if (room === null) return null;
    const asRoom = asDiggable(room as unknown as Stuff);
    if (asRoom !== null) return asRoom;

    // ⭐ The floor. Every Location has minted one since the ground build, so
    // this rung is where a `Soil` host gets found — the recorded next
    // consumer, and the reason the ladder is written out now.
    if (!MixinApi.isContainer(room)) return null;
    for (const content of (room as Stuff & Container).getContents()) {
      const asFloor = asDiggable(content);
      if (asFloor !== null) return asFloor;
    }
    return null;
  }

  protected nothingHere(model: WorkedActModel): ReturnType<typeof Mml.compose> {
    const named = model.target?.raw;
    if (named && !model.target?.stuff) {
      // They named a band and there is no such ground here.
      return Mml.compose`You turn a spadeful over and put it back. There is no ${named} here.`;
    }
    return Mml.compose`You turn a spadeful over and put it back. There is nothing here worth digging.`;
  }

  protected nothingHereReason(): string {
    return 'nothing-to-dig';
  }
}

/**
 * Narrow to the declared {@link Diggable} shape.
 *
 * ⚠ **Module-private, and NOT a `Diggables.of()` static beside the
 * interface.** `lint:lib-statics` counts every public static on an exported
 * `lib/` class against a ceiling that may fall and never rise; and the
 * precedent such a holder would have cited is a husk —
 * `class TravelNodes` has a private constructor and no members, because
 * `TeleportController` says *"inlined from `TravelNodes` when this file
 * turned out to be its only caller."* The live pattern is the local
 * narrowing, so this is the live pattern.
 */
function asDiggable(stuff: Stuff | null): (Stuff & Diggable) | null {
  if (stuff === null) return null;
  const candidate = stuff as unknown as Partial<Diggable>;
  if (candidate.diggable !== true) return null;
  if (typeof candidate.planWork !== 'function') return null;
  if (typeof candidate.completeWork !== 'function') return null;
  return stuff as Stuff & Diggable;
}
