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
 * ⭐⭐ **It is a GESTURE, not a word**, and that is why it needs line of
 * sight where `call` needs earshot.
 *
 * A trained dog holds to a hand signal. So the thing that stops `stay`
 * is not a shut door or a noisy yard — it is the animal not looking at
 * you: around a corner, in the dark, or with its back turned. ⚠ And the
 * check is **the animal perceiving YOU**, not you perceiving it. Those
 * come apart exactly where it matters: in an unlit room you can know
 * where your dog is and still have no way to signal it.
 *
 * Compare `call`, which goes out over the acoustic graph and carries
 * next door. **The two verbs fail in different places**, and that is the
 * honest difference between a word and a sign rather than a cosmetic one.
 *
 * ⚠ **A cat may refuse anyway, and that is the design.** Every asked act
 * is subject to biddability, and a cat's is 0.1 — so it never holds,
 * however devoted, and however plainly it saw you. *The word is for the
 * dog, the door is for the cat.*
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { PerceptionApi } from '../../../../api/perception';
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

    // ⚠⚠ It has to SEE you. Not "can you see it" — the sign travels the
    // other way, and in the dark those are different questions.
    if (!PerceptionApi.perceives(animal, actor)) {
      // ⭐ What you observe, not why. From outside, an animal that did
      // not see the sign and one that ignored it look identical — and
      // working out which is the player's job.
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.actor(animal)} is not looking at you.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'unseen',
        detail: animal.stuffId,
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
      .toSelf(Mml.compose`You hold a hand out. ${Mml.actor(animal)} settles where it is.`)
      .toPeers(Mml.compose`${Mml.actor(actor)} holds out a hand, and ${Mml.actor(animal)} settles.`)
      .send();
  }
}
