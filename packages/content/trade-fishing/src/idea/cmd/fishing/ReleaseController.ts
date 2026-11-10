/**
 * ReleaseController — `release <fish>`: it goes back into the water and
 * back into the record. The fish must be one of the trade's (`Fish`),
 * held, and there must be a water here to put it in. The fish releases
 * itself (`Fish.releaseInto` — the record, the deed for an apex); this
 * says it.
 */

import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { FishingController, FISHING_TOPIC } from './FishingController';
import Fish from '../../../agent/Fish';

interface ReleaseModel extends CommandModel {
  fish: MqlOneResult;
  shore?: MqlOneResult;
}

export default class ReleaseController extends FishingController<ReleaseModel> {
  async execute(model: ReleaseModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const fish = model.fish?.stuff as Stuff | undefined;
    if (!fish || !(fish instanceof Fish)) {
      this.decline(context, "That isn't a fish you can release.", 'not-a-fish');
      return;
    }
    const pick = await this.reachFor(giver, model.shore);
    if (pick !== null && !pick.ok) {
      this.decline(context, pick.refusal, pick.reason);
      return;
    }
    const reach = pick?.reach ?? null;
    if (reach === null) {
      this.decline(context, 'There is no water here to release it into.', 'no-water');
      return;
    }
    // ⚠ Asked in this frame, before anything awaits: the reconciling read
    // fires the death a beat later, and the fish must be refused as dead.
    const out = fish.releaseRefusal() ?? (await fish.releaseInto(giver, reach));
    if (!out.ok) {
      this.decline(context, 'It is dead. The water will not have it back.', out.reason);
      return;
    }
    const name = out.facts.name;
    MessageApi.scene(giver)
      .topic(FISHING_TOPIC)
      .toSelf(Mml.compose`You let the ${name} go. It holds a moment in the shallows, then it is gone.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} lets a ${name} go into the water.`)
      .send();
  }
}
