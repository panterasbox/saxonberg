/**
 * FishController — `fish [with <bait>] [at <shore>]`: the wait begins.
 *
 * The rod is a declared argument the binder resolves (`[capability.
 * angling]` in hand); the bait is optional and can be anything — the
 * engagement decides what a species makes of it; the shore is optional
 * and the Locality's reach stands in. The controller narrows on STATE
 * only: a reach to fish, hands that are free.
 */

import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { FishingController, FISHING_TOPIC } from './FishingController';
import { FishingEngagement, FISHING_TYPE } from '../../../lib/FishingEngagement';

interface FishModel extends CommandModel {
  rod: MqlOneResult;
  bait?: MqlOneResult;
  shore?: MqlOneResult;
}

export default class FishController extends FishingController<FishModel> {
  async execute(model: FishModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const rod = model.rod?.stuff as Stuff | undefined;
    if (!rod) {
      this.decline(context, 'You have nothing to fish with.', 'no-rod');
      return;
    }
    if (!MixinApi.isEngaged(giver)) {
      this.decline(context, "You can't manage that.", 'not-engageable');
      return;
    }
    if (giver.getEngagementByType(FISHING_TYPE)) {
      this.decline(context, 'Your line is already out.', 'already-fishing');
      return;
    }
    const room = this.roomOf(giver);
    const reach = await this.reachFor(giver, model.shore);
    if (room === null || reach === null) {
      this.decline(context, 'There is no water here to fish.', 'no-water');
      return;
    }
    const registry = await this.registry();
    if (registry === null) {
      this.decline(context, 'There is no water here to fish.', 'no-record');
      return;
    }
    const waters = await this.waters();
    const bait = (model.bait?.stuff as Stuff | undefined) ?? null;
    const engagement = new FishingEngagement({
      actor: giver,
      rod,
      bait,
      reachRef: reach,
      room,
      registry,
      feedFactors: (r, nowS) => waters.feedFactorsAt(r, nowS),
    });
    const result = SchedulerApi.start(engagement);
    if (result.ok && (result.status === 'started' || result.status === 'replaced')) {
      context.note(result.note);
      MessageApi.scene(giver)
        .topic(FISHING_TOPIC)
        .toSelf(
          bait
            ? Mml.compose`You bait the hook with ${Mml.thing(bait)} and cast out. The line settles on the water.`
            : Mml.compose`You cast out, bare-hooked. The line settles on the water.`,
        )
        .toPeers(Mml.compose`${Mml.actor(giver)} casts a line out over the water.`)
        .send();
      return;
    }
    if (!result.ok && result.reason === 'engagement-conflict') {
      this.decline(context, 'Your hands are busy.', 'engagement-conflict');
      return;
    }
    this.decline(context, "You can't manage that just now.", 'start-rejected');
  }
}
