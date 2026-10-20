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
import type { TakesFish } from '../../../lib/TakesFish';
import Rod from '../../../thing/Rod';

interface FishModel extends CommandModel {
  rod: MqlOneResult;
  bait?: MqlOneResult;
  shore?: MqlOneResult;
}

/** Does `s` take a fish itself (a spear)? */
function isTakesFish(s: Stuff): s is Stuff & TakesFish {
  return typeof (s as unknown as { takeFishBy?: unknown }).takeFishBy === 'function';
}

export default class FishController extends FishingController<FishModel> {
  async execute(model: FishModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.rod?.stuff as Stuff | undefined;
    // ⭐ A tool that takes a fish itself (a spear): named, or in hand when
    // no rod is — it decides what fishing with it means.
    const held: Stuff[] = MixinApi.isContainer(giver) ? giver.getContents() : [];
    const striker: (Stuff & TakesFish) | null = named !== undefined
      ? (isTakesFish(named) ? named : null)
      : held.find(isTakesFish) ?? null;
    if (striker !== null) {
      const out = await striker.takeFishBy(giver);
      if (!out.ok) {
        this.decline(context, out.line, out.reason);
        return;
      }
      MessageApi.scene(giver)
        .topic(FISHING_TOPIC)
        .toSelf(Mml.compose`${out.line}`)
        .toPeers(Mml.compose`${Mml.actor(giver)} thrusts a spear into the water and draws it back.`)
        .send();
      return;
    }
    const rod = named;
    if (!rod) {
      this.decline(context, 'You have nothing to fish with.', 'no-rod');
      return;
    }
    if (!(rod instanceof Rod)) {
      this.decline(context, `You can't fish with ${rod.getPresentation()}.`, 'not-a-rod');
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
    const pick = await this.reachFor(giver, model.shore);
    if (pick !== null && 'refusal' in pick) {
      this.decline(context, pick.refusal, pick.reason);
      return;
    }
    const reach = pick?.reach ?? null;
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
