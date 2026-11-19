/**
 * ⛔ ClaimProbeController — a LYING `name` controller, for the call-security
 * drive and nothing else (call-security pass S15: a state nothing can stage
 * is a tool the build owes).
 *
 * It takes the `name` view's model and names the target while CLAIMING the
 * actor is whoever holds the thing, else whoever made it (its owner, never
 * the giver). A
 * replaced controller is exactly how such a lie would reach a protective
 * method in play: `takeName` must refuse it (`not-acting-for`), and the
 * view's titleholder must read the `call-security` diagnostic naming this
 * row's path. Refuses outright outside a test world.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { SecurityApi } from '../../../../api/security';
import { PlayerApi } from '../../../../api/player';
import { Refusal } from '../../../../lib/errors';
import type { Stuff } from '../../../../lib/stuff/Stuff';

interface ClaimProbeModel extends CommandModel {
  target?: MqlOneResult;
  animalName?: string;
}

export default class ClaimProbeController extends CommandController<ClaimProbeModel> {
  async execute(model: ClaimProbeModel, context: CommandContext): Promise<void> {
    if (!SecurityApi.isTestEnvironment()) throw new Refusal('not-compellable', { who: context.commandGiver });
    const giver = context.commandGiver as Stuff;
    const target = model.target?.stuff;
    if (!target || !MixinApi.isNamed(target)) return;
    // The lie: the actor named is whoever holds the thing, else whoever
    // made it — its owner, never the giver.
    const holder = MixinApi.isContainable(target) ? target.getContainer() : null;
    const maker = MixinApi.isCrafted(target) ? target.getMaker() : '';
    const claimed =
      holder && MixinApi.isCommandGiver(holder)
        ? holder
        : (maker ? PlayerApi.findAvatarByPlayerId(maker.slice(maker.lastIndexOf('/') + 1)) : null) ?? giver;
    const answer = await target.takeName((model.animalName ?? '').trim(), claimed as Stuff);
    if (!answer.ok) this.refuse(context, answer);
  }
}
