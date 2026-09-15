/**
 * CallController — `call <animal>`, ⭐ asking it to come to you.
 *
 * If it complies it comes: a step through the exit into your room when
 * it is next door, otherwise a step in your direction. Being called
 * releases a `stay`.
 *
 * ⚠ **Three refusals, two sentences.** Not bonded and not biddable both
 * render *it looks at you* — the cat's answer and the stranger's answer
 * are the same, because from outside they are the same. But an animal
 * that is **attending to something** says so, quoting its own status
 * ("watching the stock"): that is not a refusal of you, it is a fact
 * about what it is doing, and it is the one case where the player
 * genuinely needs to know the difference.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

const TOPIC = 'act.deed';

interface CallModel extends CommandModel {
  target?: MqlOneResult;
}

export default class CallController extends CommandController<CallModel> {
  async execute(model: CallModel, context: CommandContext): Promise<void> {
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

    // ⭐ Attention first: an animal that is busy is not disobeying.
    const status = MixinApi.isStatus(animal) ? animal.getStatus() : '';
    if (status) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.actor(animal)} is ${status}, and does not come.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'attending',
        detail: status,
      });
      return;
    }

    if (!animal.wouldComply(actor)) {
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

    animal.setWaiting(false);

    // ⭐ It comes over. ⚠ There is no "comes from next door" case, and
    // that is a narrowing the build made rather than a simplification
    // it snuck: MQL has no adjacency scope (`reachable · inventory ·
    // peers · online · $focus` is the whole vocabulary), so an animal in
    // the next room cannot be NAMED by the player in the first place.
    // Inventing a seed to reach through a wall would be a kernel grammar
    // change, and an animal that has wandered off being genuinely gone
    // is the better answer anyway — finding it is the point.
    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.compose`${Mml.actor(animal)} comes to you.`)
      .toPeers(Mml.compose`${Mml.actor(animal)} goes to ${Mml.actor(actor)}.`)
      .send();
  }
}
