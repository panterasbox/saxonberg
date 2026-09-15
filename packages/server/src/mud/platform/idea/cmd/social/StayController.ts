/**
 * StayController — `stay <animal>`, ⭐ **your voice to a creature in
 * front of you.**
 *
 * The animal holds position until you call it or greet it. `follows` and
 * `homes` both honour the flag, so a dog told to stay does not trail you
 * out of the room and does not wander off home either.
 *
 * ⭐⭐ **`stay` came back from combat to be here**, and the reasoning
 * generalised into `command-spec.md`: *a bare verb is something your
 * body does; a subcommand is something you operate.* It had been an
 * alias on `intervene` — a standing tactical instruction — while
 * combat's own doctrine is already set-policy-then-watch. **A verb
 * collision is evidence that one of the two is on the wrong side of that
 * line**, and this one was.
 *
 * ⚠ **A cat may refuse, and that is the design.** Every asked act is
 * subject to biddability, and a cat's is 0.1 — so it never holds,
 * however devoted it is. *The word is for the dog, the door is for the
 * cat.* The honest tool for a cat is a closed door, not a louder verb.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

const TOPIC = 'act.deed';

interface StayModel extends CommandModel {
  target?: MqlOneResult;
}

export default class StayController extends CommandController<StayModel> {
  async execute(model: StayModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const animal = model.target?.stuff;
    if (!animal || !MixinApi.isBonded(animal)) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`That isn't an animal you can keep.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-bondable',
        detail: animal?.stuffId ?? '',
      });
      return;
    }

    if (!animal.wouldComply(actor)) {
      // ⚠ The SAME line whether it does not know you or simply is not
      // the kind of animal that does what it is told. Both are "it did
      // not do it", and the animal owes you no account of which.
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.actor(animal)} looks at you.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'would-not-comply',
        detail: animal.stuffId,
      });
      return;
    }

    animal.setWaiting(true);
    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.compose`${Mml.actor(animal)} settles where it is.`)
      .toPeers(Mml.compose`${Mml.actor(animal)} settles at a word from ${Mml.actor(actor)}.`)
      .send();
  }
}
