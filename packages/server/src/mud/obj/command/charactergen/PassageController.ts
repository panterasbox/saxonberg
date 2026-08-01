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
 * Zero arguments, and no `requiresEmbodied` — this is the one verb whose
 * entire purpose is to be usable by someone with no body. It is afforded
 * by `IncorporealMixin`, so only something incorporeal ever sees it.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { AppApi } from '../../../api/app';
import { ConditionApi } from '../../../api/condition';
import { ContainmentApi } from '../../../api/containment';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import { AppSettingKeys } from '../../../lib/config/AppSettings';

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

    // The wake point, read-only. Named as the seam where "wake at your
    // residence" plugs in later — that surface belongs to the residences
    // build, and this build only consumes what is already there.
    const ref = AppApi.setting(AppSettingKeys.defaultStartLocation);
    const { container } = await ContainmentApi.resolveLanding(ref);

    // Deliberately never consults the corpse: a body decays, and nothing
    // on the path back may depend on one existing.
    const body = await ConditionApi.reembody(giver, container);

    MessageApi.scene(body)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You take a breath, and it is your own. The between lets go.`,
      )
      .toPeers(Mml.compose`${Mml.name(body)} draws a first breath.`)
      .send();
  }
}
