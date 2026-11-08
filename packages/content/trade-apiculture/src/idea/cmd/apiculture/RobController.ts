/**
 * RobController — `rob <hive>`, ⭐⭐ **and the refusal is the season's.**
 *
 * The trade's one verb, and it rides the kernel's
 * {@link TapActController} because taking honey really is the same act
 * as milking a cow: point at the animal, take what is standing, reset
 * the clock. Everything that differs is the hive's own:
 *
 * ⭐⭐ **A rob takes ONE BOX-WORTH, not everything.** The mixin's
 * default take is *all of it*, and for milk that is right. For honey it
 * would delete the only decision the trade exists to force: how much of
 * the winter you leave them. So you rob again to take more, and you stop
 * to leave some, and **nothing warns you either way** (AC 8).
 * `Hive.takeFrom` owns that.
 *
 * ⭐ And `Hive.mintTake` owns the comb — frame by frame, carrying what
 * the bees foraged. That used to be this controller's `mint` override,
 * which had to stash the target on itself in an `execute` override to
 * reach the hive's forage at all; **a controller holding state about its
 * subject is the tell that the behaviour belongs on the subject**, and
 * the taps build moved it. What is left here is the verb.
 *
 * ⚠ Named `rob` because that is the word — you rob a hive. It is also
 * honest about what the act is: the bees made it for themselves.
 */

import { TapActController, type TapWords } from '@saxonberg/server/mud/platform/idea/cmd/inventory/TapActController';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Producing } from '@saxonberg/server/mud/lib/husbandry/Producing';

export default class RobController extends TapActController {
  protected tapKey(): string {
    return 'honey';
  }

  protected nothingHere(): ReturnType<typeof Mml.compose> {
    return Mml.compose`There is nothing here to rob.`;
  }

  /** ⭐ The hive's voice (D4): the flow's refusal is the season's, not the colony's. */
  protected override tapWords(giver: Stuff, subject: Stuff & Producing): TapWords {
    const base = super.tapWords(giver, subject);
    return {
      ...base,
      beginSelf: () => Mml.compose`You smoke them down and start lifting frames.`,
      onRefused: (out) => {
        switch (out.reason) {
          case 'season-no-forage':
            return Mml.compose`Nothing is in bloom within range of them. Out of the flow there is simply nothing to take, and the refusal is the season’s rather than the colony’s.`;
          case 'nothing-standing':
            return Mml.compose`Nothing capped. Out of the flow there is simply nothing to take, and the refusal is the season’s rather than the colony’s.`;
          default:
            return base.onRefused(out);
        }
      },
      onDone: (d) => {
        if (d.kind !== 'drawn') return base.onDone?.(d) ?? null;
        const frames = d.minted.length;
        return {
          self: Mml.compose`You lift out frame after frame of sealed comb and set them aside — ${String(Math.round(d.drawn * 100) / 100)} kilos of it across ${String(frames)} ${frames === 1 ? 'frame' : 'frames'}, dripping where the knife went through.`,
        };
      },
    };
  }
}
