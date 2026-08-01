/**
 * PassageController — the floor beneath coming back.
 *
 * A shade calls this and returns to the world in a new body, at the wake
 * point, carrying nothing. It asks nothing and gives nothing back.
 *
 * **Why the engine ships a way back at all.** The engine's whole
 * involvement in re-embodiment is `ConditionApi.reembody`, which content
 * calls on its own terms — a temple, a clinic, a quest, someone owed a
 * favour. Being a ghost is an authoring space and this build deliberately
 * writes no schema over it. But a player must never be stranded because
 * the content that would have brought them back does not exist, is
 * unreachable, or was deleted: that is the same failure class as the
 * snapshot defect, wearing a third costume. So the engine keeps exactly
 * one route, always available, and content is free to be better than it.
 *
 * You come back where you are standing — there is no wake point, and
 * nothing gets relocated. A shade that wants to return somewhere in
 * particular walks there first, which is the same thing a living person
 * would do.
 *
 * Zero arguments, and no `requiresEmbodied` — this is the one verb whose
 * entire purpose is to be usable by someone with no body. It is afforded
 * by `IncorporealMixin`, so only something incorporeal ever sees it.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { ConditionApi } from '../../../api/condition';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';

const TOPIC = 'world.identity';

export default class PassageController extends CommandController<CommandModel> {
  async execute(
    _model: CommandModel,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver;

    if (!MixinApi.isIncorporeal(giver)) {
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-shade',
        detail: 'You already have a body.',
      });
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You already have a body.`)
        .send();
      return;
    }

    // No wake point, and nothing is moved: you take a body where you are
    // standing. The shade walked here; this is where it stops being one.
    //
    // Deliberately never consults the corpse either: a body decays, and
    // nothing on the path back may depend on one existing.
    const body = await ConditionApi.reembody(giver);

    MessageApi.scene(body)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You take a breath, and it is your own. The between lets go.`,
      )
      .toPeers(Mml.compose`${Mml.name(body)} draws a first breath.`)
      .send();
  }
}
